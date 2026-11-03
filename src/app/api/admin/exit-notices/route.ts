import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/profile-context";
import { adminProcessExitRentRefund } from "@/lib/exit-notice-refund";
import { ExitNotice } from "@/models/ExitNotice";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

export async function GET(req: Request) {
  const { response } = await assertAdmin("legal:read");
  if (response) return response;

  await connectDB();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;
  if (url.searchParams.get("refund") === "1") {
    filter.refundStatus = "pending_admin";
  }

  const rows = await ExitNotice.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const listingIds = [...new Set(rows.map((r) => String(r.listingId)))];
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title address")
    .lean();
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));

  const profileIds = [
    ...new Set(
      rows.flatMap((r) => [
        String(r.tenantProfileId),
        String(r.landlordProfileId),
      ])
    ),
  ];
  const profiles = await Profile.find({ _id: { $in: profileIds } })
    .select("displayName kycVerifiedName userId")
    .lean();
  const profileMap = new Map(profiles.map((p) => [String(p._id), p]));
  const userIds = [...new Set(profiles.map((p) => String(p.userId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email")
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return NextResponse.json({
    notices: rows.map((n) => {
      const listing = listingMap.get(String(n.listingId));
      const tenant = profileMap.get(String(n.tenantProfileId));
      const landlord = profileMap.get(String(n.landlordProfileId));
      const tenantUser = tenant ? userMap.get(String(tenant.userId)) : null;
      const landlordUser = landlord
        ? userMap.get(String(landlord.userId))
        : null;
      return {
        id: String(n._id),
        leaseId: String(n.leaseId),
        listingId: String(n.listingId),
        listingTitle: listing?.title || "",
        listingCity: listing?.address?.city || "",
        noticeType: n.noticeType,
        reason: n.reason,
        proposedVacateDate: n.proposedVacateDate,
        status: n.status,
        documentNumber: n.documentNumber || null,
        documentUrl: n.documentUrl || null,
        termsText: n.termsText,
        aiRecommendation: n.aiRecommendation,
        aiConfidence: n.aiConfidence,
        aiReasons: n.aiReasons || [],
        requiresManualReview: n.requiresManualReview,
        unpaidRentDetected: n.unpaidRentDetected,
        suggestedRemainingRentRefund: n.suggestedRemainingRentRefund ?? 0,
        remainingRentRefundAmount: n.remainingRentRefundAmount ?? null,
        refundStatus: n.refundStatus,
        refundDecisionNotes: n.refundDecisionNotes || "",
        reviewerNotes: n.reviewerNotes || "",
        tenantName:
          tenant?.kycVerifiedName ||
          tenant?.displayName ||
          tenantUser?.name ||
          "",
        tenantEmail: tenantUser?.email || "",
        landlordName:
          landlord?.kycVerifiedName ||
          landlord?.displayName ||
          landlordUser?.name ||
          "",
        landlordEmail: landlordUser?.email || "",
        createdAt: n.createdAt,
        reviewedAt: n.reviewedAt,
        servedAt: n.servedAt,
      };
    }),
  });
}

const reviewSchema = z.object({
  noticeId: z.string().min(1),
  action: z.enum([
    "approve_and_serve",
    "reject",
    "complete",
    "refund",
    "deny_refund",
  ]),
  notes: z.string().trim().max(4000).optional(),
  refundAmount: z.number().min(0).optional(),
});

export async function PATCH(req: Request) {
  const { user, response } = await assertAdmin("legal:write");
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.noticeId)) {
    return NextResponse.json({ error: "Invalid notice." }, { status: 400 });
  }

  await connectDB();
  const notice = await ExitNotice.findById(parsed.data.noticeId);
  if (!notice) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const listing = await Listing.findById(notice.listingId).select("title").lean();
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );

  if (parsed.data.action === "reject") {
    if (!["pending_ai", "pending_review", "approved"].includes(notice.status)) {
      return NextResponse.json(
        { error: "Notice cannot be rejected in its current status." },
        { status: 409 }
      );
    }
    notice.status = "rejected";
    notice.reviewerUserId = new mongoose.Types.ObjectId(user.id);
    notice.reviewerNotes = parsed.data.notes || "";
    notice.reviewedAt = new Date();
    await notice.save();

    const landlord = await Profile.findById(notice.landlordProfileId)
      .select("userId")
      .lean();
    if (landlord?.userId) {
      await notifyUser({
        userId: String(landlord.userId),
        type: "exit_notice.rejected",
        title: "Exit notice rejected",
        body: `Legal/ops rejected the exit notice for “${listing?.title || "property"}”. ${parsed.data.notes || ""}`.trim(),
        link: "/portal/exit-notices",
      }).catch(() => undefined);
    }

    await writeAudit({
      action: "exit_notice.reject",
      summary: `Rejected exit notice ${notice.documentNumber || notice._id}`,
      actor: actorFromUser(user),
      entityType: "exit_notice",
      entityId: String(notice._id),
      metadata: { notes: parsed.data.notes || "" },
      request: req,
    });

    return NextResponse.json({ ok: true, status: notice.status });
  }

  if (parsed.data.action === "approve_and_serve") {
    if (!["pending_ai", "pending_review", "approved"].includes(notice.status)) {
      return NextResponse.json(
        { error: "Notice cannot be served in its current status." },
        { status: 409 }
      );
    }
    notice.status = "served";
    notice.reviewerUserId = new mongoose.Types.ObjectId(user.id);
    notice.reviewerNotes = parsed.data.notes || notice.reviewerNotes || "";
    notice.reviewedAt = new Date();
    notice.servedAt = new Date();
    notice.documentUrl = `${appUrl}/api/portal/exit-notices/${notice._id}/document`;
    await notice.save();

    const tenant = await Profile.findById(notice.tenantProfileId)
      .select("userId")
      .lean();
    const tenantUser = tenant
      ? await User.findById(tenant.userId).select("email").lean()
      : null;
    if (tenant?.userId) {
      await notifyUser({
        userId: String(tenant.userId),
        type: "exit_notice.served",
        title: "Exit notice served",
        body: `An exit / vacate notice for “${listing?.title || "your home"}” has been reviewed and served. Vacate date: ${notice.proposedVacateDate.toLocaleDateString("en-NG")}.`,
        link: "/portal/exit-notices",
        email: tenantUser?.email
          ? {
              to: tenantUser.email,
              subject: `Exit notice · ${notice.documentNumber || "House In Hands"}`,
            }
          : undefined,
      }).catch(() => undefined);
    }

    await writeAudit({
      action: "exit_notice.serve",
      summary: `Approved & served exit notice ${notice.documentNumber || notice._id}`,
      actor: actorFromUser(user),
      entityType: "exit_notice",
      entityId: String(notice._id),
      metadata: {
        notes: parsed.data.notes || "",
        aiRecommendation: notice.aiRecommendation,
      },
      request: req,
    });

    return NextResponse.json({
      ok: true,
      status: notice.status,
      documentUrl: notice.documentUrl,
    });
  }

  if (parsed.data.action === "complete") {
    if (!["served", "acknowledged"].includes(notice.status)) {
      return NextResponse.json(
        { error: "Complete only after the notice is served." },
        { status: 409 }
      );
    }
    notice.status = "completed";
    notice.completedAt = new Date();
    await notice.save();

    const lease = await Lease.findById(notice.leaseId);
    if (lease && lease.status === "active") {
      lease.status = "terminated";
      await lease.save();
    }
    const listingDoc = await Listing.findById(notice.listingId);
    if (listingDoc && listingDoc.availabilityStatus === "occupied") {
      listingDoc.availabilityStatus = "available";
      await listingDoc.save();
    }

    await writeAudit({
      action: "exit_notice.complete",
      summary: `Completed exit notice ${notice.documentNumber || notice._id}`,
      actor: actorFromUser(user),
      entityType: "exit_notice",
      entityId: String(notice._id),
      request: req,
    });

    return NextResponse.json({ ok: true, status: notice.status });
  }

  if (parsed.data.action === "refund" || parsed.data.action === "deny_refund") {
    try {
      const result = await adminProcessExitRentRefund({
        noticeId: notice._id,
        amount: parsed.data.refundAmount ?? notice.suggestedRemainingRentRefund ?? 0,
        decision: parsed.data.action === "refund" ? "refund" : "deny",
        notes: parsed.data.notes,
        actor: actorFromUser(user) || {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: true,
        },
        adminUserId: user.id,
      });

      const tenant = await Profile.findById(notice.tenantProfileId)
        .select("userId")
        .lean();
      if (tenant?.userId) {
        await notifyUser({
          userId: String(tenant.userId),
          type: "exit_notice.refund",
          title:
            parsed.data.action === "refund"
              ? "Exit rent refund processed"
              : "Exit rent refund denied",
          body:
            parsed.data.action === "refund"
              ? `Admin/legal credited ${result.refunded.toLocaleString()} to your wallet based on the agreement.`
              : `Admin/legal denied a remaining-rent refund for this exit. ${parsed.data.notes || ""}`.trim(),
          link: "/portal/payments",
        }).catch(() => undefined);
      }

      return NextResponse.json({
        ok: true,
        refundStatus: result.notice.refundStatus,
        refunded: result.refunded,
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Refund failed." },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
