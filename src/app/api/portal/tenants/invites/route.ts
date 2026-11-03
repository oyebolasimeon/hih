import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import {
  requireActiveProfile,
  requireVerifiedProfile,
} from "@/lib/profile-context";
import { Listing } from "@/models/Listing";
import { TenantInvite } from "@/models/TenantInvite";
import { User } from "@/models/User";
import { sendTenantInviteEmail } from "@/lib/tenant-invite-mail";

const createSchema = z.object({
  listingId: z.string().min(1),
  tenantName: z.string().trim().min(2).max(120),
  tenantEmail: z.string().trim().email().max(200),
  rentAmount: z.number().positive().optional(),
  paymentPeriod: z.enum(["monthly", "yearly", "term"]).optional(),
  startDate: z.string().min(4),
  endDate: z.string().optional().nullable(),
  notes: z.string().trim().max(2000).optional(),
});

const INVITE_TTL_DAYS = 14;

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, [
    "landlord",
    "estate_manager",
  ]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  await connectDB();
  const rows = await TenantInvite.find({
    landlordProfileId: active.profile._id,
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({
    invites: rows.map((r) => ({
      id: String(r._id),
      listingId: String(r.listingId),
      tenantName: r.tenantName,
      tenantEmail: r.tenantEmail,
      status: r.status,
      rentAmount: r.rentAmount,
      currency: r.currency,
      paymentPeriod: r.paymentPeriod,
      startDate: r.startDate,
      endDate: r.endDate || null,
      expiresAt: r.expiresAt,
      leaseId: r.leaseId ? String(r.leaseId) : null,
      createdAt: r.createdAt,
    })),
  });
}

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, [
    "landlord",
    "estate_manager",
  ]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }
  const verified = requireVerifiedProfile(active.profile);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error },
      { status: verified.status }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid invite payload." },
      { status: 400 }
    );
  }

  await connectDB();
  const listing = await Listing.findOne({
    _id: parsed.data.listingId,
    $or: [
      { ownerProfileId: active.profile._id },
      { ownerUserId: user.id },
    ],
  });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  // Cancel previous pending invites for this listing
  await TenantInvite.updateMany(
    { listingId: listing._id, status: "pending" },
    { $set: { status: "cancelled" } }
  );

  const startDate = new Date(parsed.data.startDate);
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid start date." }, { status: 400 });
  }
  let endDate: Date | undefined;
  if (parsed.data.endDate) {
    endDate = new Date(parsed.data.endDate);
    if (Number.isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid end date." }, { status: 400 });
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);
  const token = randomBytes(24).toString("hex");

  const invite = await TenantInvite.create({
    listingId: listing._id,
    landlordProfileId: active.profile._id,
    landlordUserId: user.id,
    tenantName: parsed.data.tenantName,
    tenantEmail: parsed.data.tenantEmail.toLowerCase(),
    token,
    status: "pending",
    rentAmount: parsed.data.rentAmount ?? listing.price.amount,
    currency: listing.price.currency || "NGN",
    paymentPeriod: parsed.data.paymentPeriod ?? listing.price.period,
    startDate,
    endDate,
    notes: parsed.data.notes,
    expiresAt,
  });

  // Keep property as management/occupied so it stays off marketplace
  if (listing.availabilityStatus === "available") {
    listing.availabilityStatus = "occupied";
    await listing.save();
  } else if (listing.availabilityStatus === "draft") {
    listing.availabilityStatus = "occupied";
    await listing.save();
  }

  const landlordUser = await User.findById(user.id).select("name").lean();
  try {
    await sendTenantInviteEmail({
      to: invite.tenantEmail,
      tenantName: invite.tenantName,
      landlordName:
        active.profile.displayName || landlordUser?.name || "Your landlord",
      propertyTitle: listing.title,
      propertyAddress: `${listing.address.street}, ${listing.address.city}, ${listing.address.state}`,
      rentLabel: `${invite.currency} ${invite.rentAmount.toLocaleString()} / ${invite.paymentPeriod}`,
      token: invite.token,
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    console.error("Tenant invite email failed:", err);
  }

  await writeAudit({
    action: "tenant.invite",
    summary: `Invited ${invite.tenantEmail} to ${listing.title}`,
    actor: actorFromUser(user),
    entityType: "tenant_invite",
    entityId: String(invite._id),
    metadata: {
      listingId: String(listing._id),
      tenantEmail: invite.tenantEmail,
    },
    request: req,
  });

  return NextResponse.json(
    {
      invite: {
        id: String(invite._id),
        listingId: String(listing._id),
        tenantEmail: invite.tenantEmail,
        status: invite.status,
        expiresAt: invite.expiresAt,
      },
    },
    { status: 201 }
  );
}
