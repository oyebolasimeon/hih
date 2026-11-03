import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import {
  notifyUser,
  requireActiveProfile,
  requireVerifiedProfile,
} from "@/lib/profile-context";
import { reviewExitNoticeWithAi } from "@/lib/exit-notice-ai-review";
import { buildExitNoticeTerms } from "@/lib/exit-notice-legal";
import { suggestRemainingRentRefund } from "@/lib/exit-notice-refund";
import { ExitNotice } from "@/models/ExitNotice";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

function serializeNotice(
  n: Record<string, unknown>,
  extras?: Record<string, unknown>
) {
  return {
    id: String(n._id),
    leaseId: String(n.leaseId),
    listingId: String(n.listingId),
    tenantProfileId: String(n.tenantProfileId),
    landlordProfileId: String(n.landlordProfileId),
    initiatedBy: n.initiatedBy || null,
    noticeType: n.noticeType,
    reason: n.reason,
    proposedVacateDate: n.proposedVacateDate,
    status: n.status,
    termsText: n.termsText || "",
    legalProvider: n.legalProvider || "hih",
    documentNumber: n.documentNumber || null,
    documentUrl: n.documentUrl || null,
    aiRecommendation: n.aiRecommendation || null,
    aiConfidence: n.aiConfidence ?? null,
    aiReasons: n.aiReasons || [],
    requiresManualReview: Boolean(n.requiresManualReview),
    reviewerNotes: n.reviewerNotes || "",
    reviewedAt: n.reviewedAt || null,
    servedAt: n.servedAt || null,
    tenantAcknowledgedAt: n.tenantAcknowledgedAt || null,
    unpaidRentDetected: Boolean(n.unpaidRentDetected),
    suggestedRemainingRentRefund: n.suggestedRemainingRentRefund ?? null,
    remainingRentRefundAmount: n.remainingRentRefundAmount ?? null,
    refundStatus: n.refundStatus || "none",
    refundDecisionNotes: n.refundDecisionNotes || "",
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    ...extras,
  };
}

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const profiles = await Profile.find({ userId: user.id }).select("_id type").lean();
  const profileIds = profiles.map((p) => p._id);

  const rows = await ExitNotice.find({
    $or: [
      { tenantProfileId: { $in: profileIds } },
      { landlordProfileId: { $in: profileIds } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const listingIds = [...new Set(rows.map((r) => String(r.listingId)))];
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title address")
    .lean();
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));
  const profileIdSet = new Set(profiles.map((p) => String(p._id)));

  return NextResponse.json({
    notices: rows.map((n) => {
      const listing = listingMap.get(String(n.listingId));
      const isTenant = profileIdSet.has(String(n.tenantProfileId));
      const isLandlord = profileIdSet.has(String(n.landlordProfileId));
      // Hide landlord-issued notices from tenant until served; tenant can see own requests.
      if (
        isTenant &&
        !isLandlord &&
        n.initiatedBy !== "tenant" &&
        !["served", "acknowledged", "completed"].includes(String(n.status))
      ) {
        return null;
      }
      return serializeNotice(n as unknown as Record<string, unknown>, {
        viewerRole: isTenant && isLandlord ? "both" : isTenant ? "tenant" : "landlord",
        listing: listing
          ? {
              id: String(listing._id),
              title: listing.title,
              city: listing.address?.city,
              state: listing.address?.state,
            }
          : null,
      });
    }).filter(Boolean),
  });
}

const createSchema = z.object({
  leaseId: z.string().min(1),
  noticeType: z.enum([
    "landlord_quit",
    "tenant_early_exit",
    "mutual",
    "expiry",
  ]),
  reason: z.string().trim().min(10).max(4000),
  proposedVacateDate: z.string().min(4),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 }
    );
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.leaseId)) {
    return NextResponse.json({ error: "Invalid lease." }, { status: 400 });
  }

  const vacate = new Date(parsed.data.proposedVacateDate);
  if (Number.isNaN(vacate.getTime())) {
    return NextResponse.json({ error: "Invalid vacate date." }, { status: 400 });
  }
  if (vacate.getTime() < Date.now() - 24 * 60 * 60 * 1000) {
    return NextResponse.json(
      { error: "Vacate date cannot be in the past." },
      { status: 400 }
    );
  }

  await connectDB();
  const lease = await Lease.findById(parsed.data.leaseId);
  if (!lease || lease.status !== "active") {
    return NextResponse.json(
      { error: "Exit notices apply to active leases only." },
      { status: 400 }
    );
  }

  const profiles = await Profile.find({ userId: user.id }).select("_id type").lean();
  const profileIds = new Set(profiles.map((p) => String(p._id)));
  const isLandlord = profileIds.has(String(lease.landlordProfileId));
  const isTenant = profileIds.has(String(lease.tenantProfileId));

  if (!isLandlord && !isTenant) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (isLandlord) {
    const active = await requireActiveProfile(user.id, [
      "landlord",
      "estate_manager",
    ]);
    if (!active.ok) {
      return NextResponse.json({ error: active.error }, { status: active.status });
    }
    const verified = requireVerifiedProfile(active.profile);
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: verified.status });
    }
  } else {
    const active = await requireActiveProfile(user.id, ["tenant", "student"]);
    if (!active.ok) {
      return NextResponse.json({ error: active.error }, { status: active.status });
    }
  }

  const open = await ExitNotice.findOne({
    leaseId: lease._id,
    status: {
      $in: [
        "pending_ai",
        "pending_review",
        "approved",
        "served",
        "acknowledged",
      ],
    },
  });
  if (open) {
    return NextResponse.json(
      { error: "An open exit notice already exists for this lease." },
      { status: 409 }
    );
  }

  const listing = await Listing.findById(lease.listingId);
  if (!listing) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const [tenantProfile, landlordProfile] = await Promise.all([
    Profile.findById(lease.tenantProfileId).select("displayName kycVerifiedName userId").lean(),
    Profile.findById(lease.landlordProfileId)
      .select("displayName kycVerifiedName userId")
      .lean(),
  ]);
  const landlordUser = landlordProfile
    ? await User.findById(landlordProfile.userId).select("name email").lean()
    : null;
  const tenantUser = tenantProfile
    ? await User.findById(tenantProfile.userId).select("name email").lean()
    : null;

  const refundHint = await suggestRemainingRentRefund({
    leaseId: lease._id,
    proposedVacateDate: vacate,
  });

  const noticeType =
    parsed.data.noticeType === "landlord_quit" && isTenant
      ? "tenant_early_exit"
      : parsed.data.noticeType === "tenant_early_exit" && isLandlord
        ? "landlord_quit"
        : parsed.data.noticeType;

  const termsText = buildExitNoticeTerms({
    noticeType,
    propertyTitle: listing.title,
    propertyAddress: `${listing.address.street}, ${listing.address.city}, ${listing.address.state}`,
    landlordName:
      landlordProfile?.kycVerifiedName ||
      landlordProfile?.displayName ||
      landlordUser?.name ||
      "Landlord",
    tenantName:
      tenantProfile?.kycVerifiedName ||
      tenantProfile?.displayName ||
      tenantUser?.name ||
      "Tenant",
    proposedVacateDate: vacate,
    reason: parsed.data.reason,
    leaseStart: lease.startDate,
    leaseEnd: lease.endDate,
    rentAmount: lease.rentAmount,
    currency: lease.currency,
    paymentPeriod: lease.paymentPeriod,
    leaseTermsExcerpt: lease.termsText || "",
    unpaidRentDetected: refundHint.unpaidRentDetected,
  });

  const daysUntilVacate = Math.ceil(
    (vacate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
  );

  const ai = await reviewExitNoticeWithAi({
    noticeType,
    reason: parsed.data.reason,
    proposedVacateDate: vacate,
    leaseStart: lease.startDate,
    leaseEnd: lease.endDate,
    rentAmount: lease.rentAmount,
    currency: lease.currency,
    paymentPeriod: lease.paymentPeriod,
    leaseTermsText: lease.termsText || "",
    unpaidRentDetected: refundHint.unpaidRentDetected,
    daysUntilVacate,
  });

  const documentNumber = `EXIT-${new Date().getFullYear()}-${randomBytes(3)
    .toString("hex")
    .toUpperCase()}`;

  const notice = await ExitNotice.create({
    leaseId: lease._id,
    listingId: lease.listingId,
    tenantProfileId: lease.tenantProfileId,
    landlordProfileId: lease.landlordProfileId,
    initiatedBy: isLandlord ? "landlord" : "tenant",
    initiatedByUserId: new mongoose.Types.ObjectId(user.id),
    noticeType,
    reason: parsed.data.reason,
    proposedVacateDate: vacate,
    status: "pending_review",
    termsText,
    legalProvider: lease.legalProvider || "hih",
    legalCompanyName: lease.legalCompanyName,
    documentNumber,
    aiRecommendation: ai.recommendation,
    aiConfidence: ai.confidence,
    aiReasons: ai.reasons,
    requiresManualReview: true,
    unpaidRentDetected: refundHint.unpaidRentDetected,
    suggestedRemainingRentRefund: refundHint.suggestedRefund,
    remainingRentRefundCurrency: refundHint.currency,
    remainingRentRefundPaymentId: refundHint.paymentId
      ? new mongoose.Types.ObjectId(refundHint.paymentId)
      : undefined,
    refundStatus:
      refundHint.unpaidRentDetected || refundHint.suggestedRefund > 0 || ai.refundLikelyNeeded
        ? "pending_admin"
        : "none",
  });

  // Landlord-issued notices are NOT shown to the tenant until admin/legal serves them.
  // Tenant early-exit requests notify the landlord immediately (still pending review).
  if (!isLandlord && landlordProfile?.userId) {
    await notifyUser({
      userId: String(landlordProfile.userId),
      type: "exit_notice.submitted",
      title: "Tenant exit request submitted",
      body: `Your tenant requested early exit for “${listing.title}”. It is under House In Hands AI + legal/ops review.`,
      link: "/portal/exit-notices",
    }).catch(() => undefined);
  }

  await writeAudit({
    action: "exit_notice.create",
    summary: `${noticeType} notice submitted for ${listing.title}`,
    actor: actorFromUser(user),
    entityType: "exit_notice",
    entityId: String(notice._id),
    metadata: {
      leaseId: String(lease._id),
      aiRecommendation: ai.recommendation,
      unpaidRentDetected: refundHint.unpaidRentDetected,
      suggestedRefund: refundHint.suggestedRefund,
    },
    request: req,
  });

  return NextResponse.json(
    {
      notice: serializeNotice(notice.toObject() as unknown as Record<string, unknown>, {
        viewerRole: isLandlord ? "landlord" : "tenant",
        listing: {
          id: String(listing._id),
          title: listing.title,
          city: listing.address.city,
          state: listing.address.state,
        },
        refundHintNote: refundHint.note,
      }),
    },
    { status: 201 }
  );
}
