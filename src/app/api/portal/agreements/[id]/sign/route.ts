import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/profile-context";
import { ensureAgreementFeeMarkedPaid } from "@/lib/agreement-fee";
import { finalizeSignedAgreement } from "@/lib/agreement-document";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

const signSchema = z.object({
  role: z.enum(["tenant", "landlord"]),
  signatureName: z.string().trim().min(2).max(120),
});

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid agreement." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid signature." },
      { status: 400 }
    );
  }

  await connectDB();
  let lease = await Lease.findById(id);
  if (!lease) {
    return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  }
  if (!["draft", "pending_signature"].includes(lease.status)) {
    return NextResponse.json(
      { error: "This agreement is not awaiting signatures." },
      { status: 409 }
    );
  }

  // Heal missed paid flags so signing unlocks right after a successful fee payment.
  lease = (await ensureAgreementFeeMarkedPaid(lease._id)) || lease;

  const feeRequired = (lease.agreementFeeAmount || 0) > 0;
  if (!feeRequired && !lease.agreementFeePaidAt) {
    lease.agreementFeePaidAt = new Date();
  }
  if (feeRequired && !lease.agreementFeePaidAt) {
    return NextResponse.json(
      {
        error:
          "The agreement fee must be paid before either party can sign. After payment, tenant and landlord can each sign independently.",
        code: "AGREEMENT_FEE_REQUIRED",
      },
      { status: 402 }
    );
  }

  const profiles = await Profile.find({ userId: user.id }).select("_id type").lean();
  const profileIds = new Set(profiles.map((p) => String(p._id)));

  const isTenant = profileIds.has(String(lease.tenantProfileId));
  const isLandlord = profileIds.has(String(lease.landlordProfileId));

  if (parsed.data.role === "tenant") {
    if (!isTenant) {
      return NextResponse.json(
        { error: "Only the tenant on this agreement can sign as tenant." },
        { status: 403 }
      );
    }
    if (lease.tenantSignedAt) {
      return NextResponse.json(
        { error: "Tenant has already signed." },
        { status: 409 }
      );
    }
    lease.tenantSignatureName = parsed.data.signatureName;
    lease.tenantSignedAt = new Date();
  } else {
    if (!isLandlord) {
      return NextResponse.json(
        { error: "Only the landlord on this agreement can sign as landlord." },
        { status: 403 }
      );
    }
    if (lease.landlordSignedAt) {
      return NextResponse.json(
        { error: "Landlord has already signed." },
        { status: 409 }
      );
    }
    lease.landlordSignatureName = parsed.data.signatureName;
    lease.landlordSignedAt = new Date();
  }

  // Re-read after role updates so a prior landlord signature is never lost
  // when the tenant signs second (and vice versa).
  const bothSigned = Boolean(lease.tenantSignedAt && lease.landlordSignedAt);
  if (bothSigned) {
    lease.status = "active";
    lease.signedAt = new Date();
  } else if (lease.status === "draft" || lease.status === "pending_signature") {
    lease.status = "pending_signature";
  }

  await lease.save();

  if (bothSigned) {
    const listing = await Listing.findById(lease.listingId);
    if (listing && listing.availabilityStatus !== "occupied") {
      listing.availabilityStatus = "occupied";
      await listing.save();
    }
  }

  if (bothSigned) {
    try {
      await finalizeSignedAgreement(lease);
    } catch (err) {
      console.warn("Agreement document email failed:", err);
    }
  }

  const tenantProfile = await Profile.findById(lease.tenantProfileId)
    .select("userId displayName")
    .lean();
  const landlordProfile = await Profile.findById(lease.landlordProfileId)
    .select("userId displayName")
    .lean();
  const listing = await Listing.findById(lease.listingId).select("title").lean();

  const notifyIds = [
    tenantProfile ? String(tenantProfile.userId) : null,
    landlordProfile ? String(landlordProfile.userId) : null,
  ].filter(Boolean) as string[];

  const users = await User.find({ _id: { $in: notifyIds } })
    .select("email")
    .lean();
  const emailMap = new Map(users.map((u) => [String(u._id), u.email]));

  for (const uid of notifyIds) {
    await notifyUser({
      userId: uid,
      type: bothSigned ? "lease.active" : "lease.signed",
      title: bothSigned ? "Lease is active" : "Lease signature update",
      body: bothSigned
        ? `Both parties signed the agreement for “${listing?.title || "your listing"}”. The tenancy is now active.`
        : `${parsed.data.role === "tenant" ? "Tenant" : "Landlord"} signed the agreement for “${listing?.title || "your listing"}”.`,
      link: "/portal/agreements",
      meta: { leaseId: String(lease._id), bothSigned },
      email: emailMap.get(uid)
        ? {
            to: emailMap.get(uid)!,
            subject: bothSigned ? "Lease activated" : "Lease signature update",
          }
        : undefined,
    });
  }

  await writeAudit({
    action: bothSigned ? "lease.activate" : "lease.sign",
    summary: `${parsed.data.role} signed lease${bothSigned ? "; activated" : ""}`,
    actor: actorFromUser(user),
    entityType: "lease",
    entityId: String(lease._id),
    metadata: { role: parsed.data.role, signatureName: parsed.data.signatureName },
    request: req,
  });

  return NextResponse.json({
    agreement: {
      id: String(lease._id),
      status: lease.status,
      tenantSignedAt: lease.tenantSignedAt || null,
      landlordSignedAt: lease.landlordSignedAt || null,
      signedAt: lease.signedAt || null,
      tenantSignatureName: lease.tenantSignatureName || "",
      landlordSignatureName: lease.landlordSignatureName || "",
    },
  });
}
