import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { buildLeaseFromListing } from "@/lib/create-lease";
import { notifyUser } from "@/lib/profile-context";
import { Listing } from "@/models/Listing";
import { Lease } from "@/models/Lease";
import { Profile } from "@/models/Profile";
import { TenantInvite } from "@/models/TenantInvite";
import { User } from "@/models/User";

type RouteCtx = { params: Promise<{ token: string }> };

async function loadInvite(token: string) {
  const invite = await TenantInvite.findOne({ token });
  if (!invite) return { error: "Invite not found.", status: 404 as const };
  if (invite.status === "cancelled") {
    return { error: "This invite was cancelled.", status: 410 as const };
  }
  if (invite.status === "expired" || invite.expiresAt.getTime() < Date.now()) {
    if (invite.status === "pending") {
      invite.status = "expired";
      await invite.save();
    }
    return { error: "This invite has expired.", status: 410 as const };
  }
  return { invite };
}

export async function GET(_req: Request, ctx: RouteCtx) {
  const { token } = await ctx.params;
  await connectDB();
  const loaded = await loadInvite(token);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }
  const { invite } = loaded;
  const listing = await Listing.findById(invite.listingId).lean();
  const landlord = await Profile.findById(invite.landlordProfileId)
    .select("displayName")
    .lean();

  return NextResponse.json({
    invite: {
      id: String(invite._id),
      status: invite.status,
      tenantName: invite.tenantName,
      tenantEmail: invite.tenantEmail,
      rentAmount: invite.rentAmount,
      currency: invite.currency,
      paymentPeriod: invite.paymentPeriod,
      startDate: invite.startDate,
      endDate: invite.endDate || null,
      notes: invite.notes || "",
      expiresAt: invite.expiresAt,
      leaseId: invite.leaseId ? String(invite.leaseId) : null,
      landlordName: landlord?.displayName || "Landlord",
      listing: listing
        ? {
            id: String(listing._id),
            title: listing.title,
            city: listing.address.city,
            state: listing.address.state,
            street: listing.address.street,
            imageUrl: listing.images?.find((i) => i.isPrimary)?.url || listing.images?.[0]?.url || null,
          }
        : null,
    },
  });
}

export async function POST(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { token } = await ctx.params;
  await connectDB();
  const loaded = await loadInvite(token);
  if ("error" in loaded) {
    return NextResponse.json({ error: loaded.error }, { status: loaded.status });
  }
  const { invite } = loaded;

  if (invite.status === "accepted" && invite.leaseId) {
    return NextResponse.json({
      alreadyAccepted: true,
      leaseId: String(invite.leaseId),
    });
  }

  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: "This invite can no longer be accepted." },
      { status: 409 }
    );
  }

  // Prefer matching email; still allow logged-in user to accept their invite.
  const dbUser = await User.findById(user.id).select("email name").lean();
  if (
    dbUser?.email &&
    invite.tenantEmail &&
    dbUser.email.toLowerCase() !== invite.tenantEmail.toLowerCase()
  ) {
    return NextResponse.json(
      {
        error: `Sign in with ${invite.tenantEmail} to accept this invitation.`,
      },
      { status: 403 }
    );
  }

  let tenantProfile = await Profile.findOne({
    userId: user.id,
    type: { $in: ["tenant", "student"] },
  }).sort({
    status: 1,
    updatedAt: -1,
  });

  if (!tenantProfile) {
    tenantProfile = await Profile.create({
      userId: user.id,
      type: "tenant",
      status: "draft",
      displayName: invite.tenantName || dbUser?.name || "Tenant",
    });
  }

  const listing = await Listing.findById(invite.listingId);
  if (!listing) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const existingActive = await Lease.findOne({
    listingId: listing._id,
    tenantProfileId: tenantProfile._id,
    status: { $in: ["draft", "pending_signature", "active"] },
  });
  if (existingActive) {
    invite.status = "accepted";
    invite.acceptedUserId = new mongoose.Types.ObjectId(user.id);
    invite.acceptedProfileId = tenantProfile._id;
    invite.leaseId = existingActive._id;
    await invite.save();
    return NextResponse.json({
      leaseId: String(existingActive._id),
      profileId: String(tenantProfile._id),
      alreadyLinked: true,
    });
  }

  const lease = await buildLeaseFromListing({
    listing,
    tenantProfileId: tenantProfile._id,
    landlordProfileId: invite.landlordProfileId,
    source: "landlord_invite",
    startDate: invite.startDate,
    endDate: invite.endDate || null,
    rentAmount: invite.rentAmount,
    paymentPeriod: invite.paymentPeriod,
    currency: invite.currency,
    status: "pending_signature",
    notesLine:
      invite.notes ||
      "Lease created from landlord invite for an existing occupancy.",
  });

  listing.availabilityStatus = "pending";
  await listing.save();

  invite.status = "accepted";
  invite.acceptedUserId = new mongoose.Types.ObjectId(user.id);
  invite.acceptedProfileId = tenantProfile._id;
  invite.leaseId = lease._id;
  await invite.save();

  await notifyUser({
    userId: String(invite.landlordUserId),
    type: "tenant.invite_accepted",
    title: "Tenant accepted your invite",
    body: `${invite.tenantName} accepted the invite for “${listing.title}”. Sign the agreement to activate the tenancy.`,
    link: "/portal/agreements",
  });

  await writeAudit({
    action: "tenant.invite_accept",
    summary: `${invite.tenantEmail} accepted invite for ${listing.title}`,
    actor: actorFromUser(user),
    entityType: "tenant_invite",
    entityId: String(invite._id),
    metadata: { leaseId: String(lease._id), listingId: String(listing._id) },
    request: req,
  });

  return NextResponse.json({
    leaseId: String(lease._id),
    profileId: String(tenantProfile._id),
    listingId: String(listing._id),
  });
}
