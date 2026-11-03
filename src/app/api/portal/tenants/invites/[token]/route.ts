import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { buildLeaseFromListing } from "@/lib/create-lease";
import { tenantInviteLegalText } from "@/lib/invite-legal";
import { notifyUser } from "@/lib/profile-context";
import { Application } from "@/models/Application";
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

async function landlordPublicCard(landlordProfileId: mongoose.Types.ObjectId) {
  const landlord = await Profile.findById(landlordProfileId)
    .select("displayName type status phone userId verifiedAt kycVerifiedName")
    .lean();
  if (!landlord) return null;
  const landlordUser = await User.findById(landlord.userId)
    .select("name email")
    .lean();
  return {
    profileId: String(landlord._id),
    displayName:
      landlord.kycVerifiedName ||
      landlord.displayName ||
      landlordUser?.name ||
      "Landlord",
    email: landlordUser?.email || "",
    phone: landlord.phone || "",
    profileType: landlord.type,
    verificationStatus: landlord.status,
    verifiedAt: landlord.verifiedAt || null,
    isVerified: landlord.status === "verified",
  };
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
  const landlord = await landlordPublicCard(invite.landlordProfileId);
  const propertyAddress = listing
    ? `${listing.address.street}, ${listing.address.city}, ${listing.address.state}`
    : "";
  const legalText = tenantInviteLegalText({
    landlordName: landlord?.displayName || "the landlord",
    landlordEmail: landlord?.email || "their registered email",
    propertyTitle: listing?.title || "this property",
    propertyAddress: propertyAddress || "the listed address",
  });

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
      applicationId: invite.applicationId ? String(invite.applicationId) : null,
      landlord: landlord,
      landlordName: landlord?.displayName || "Landlord",
      legalAcknowledgement: legalText,
      listing: listing
        ? {
            id: String(listing._id),
            title: listing.title,
            city: listing.address.city,
            state: listing.address.state,
            street: listing.address.street,
            addressLine: propertyAddress,
            imageUrl:
              listing.images?.find(
                (i: { isPrimary?: boolean; url?: string }) => i.isPrimary
              )?.url ||
              listing.images?.[0]?.url ||
              null,
          }
        : null,
    },
  });
}

const acceptSchema = z.object({
  legalAcknowledged: z.literal(true),
});

export async function POST(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { token } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "You must confirm the landlord identity and invitation terms before accepting.",
      },
      { status: 400 }
    );
  }

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
      applicationId: invite.applicationId
        ? String(invite.applicationId)
        : null,
    });
  }

  if (invite.status !== "pending") {
    return NextResponse.json(
      { error: "This invite can no longer be accepted." },
      { status: 409 }
    );
  }

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

  // Make this the active profile so maintenance/agreements resolve correctly.
  await User.findByIdAndUpdate(user.id, {
    $set: { activeProfileId: tenantProfile._id },
  });

  const listing = await Listing.findById(invite.listingId);
  if (!listing) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const landlord = await landlordPublicCard(invite.landlordProfileId);
  const propertyAddress = `${listing.address.street}, ${listing.address.city}, ${listing.address.state}`;
  const legalText = tenantInviteLegalText({
    landlordName: landlord?.displayName || "the landlord",
    landlordEmail: landlord?.email || "their registered email",
    propertyTitle: listing.title,
    propertyAddress,
  });

  const existingActive = await Lease.findOne({
    listingId: listing._id,
    tenantProfileId: tenantProfile._id,
    status: { $in: ["draft", "pending_signature", "active"] },
  });
  if (existingActive) {
    let applicationId = invite.applicationId;
    if (!applicationId) {
      const app = await Application.create({
        listingId: listing._id,
        applicantProfileId: tenantProfile._id,
        applicantUserId: user.id,
        landlordProfileId: invite.landlordProfileId,
        status: "approved",
        source: "landlord_invite",
        inviteId: invite._id,
        message: "Linked via landlord invite (existing occupancy).",
        landlordNotes: "Tenant accepted invite for already-occupied property.",
      });
      applicationId = app._id;
      if (!existingActive.applicationId) {
        existingActive.applicationId = app._id;
        await existingActive.save();
      }
    }
    invite.status = "accepted";
    invite.acceptedUserId = new mongoose.Types.ObjectId(user.id);
    invite.acceptedProfileId = tenantProfile._id;
    invite.leaseId = existingActive._id;
    invite.applicationId = applicationId;
    invite.legalAcknowledgedAt = new Date();
    invite.legalAcknowledgementText = legalText;
    await invite.save();
    return NextResponse.json({
      leaseId: String(existingActive._id),
      applicationId: String(applicationId),
      profileId: String(tenantProfile._id),
      alreadyLinked: true,
    });
  }

  const application = await Application.create({
    listingId: listing._id,
    applicantProfileId: tenantProfile._id,
    applicantUserId: user.id,
    landlordProfileId: invite.landlordProfileId,
    status: "approved",
    source: "landlord_invite",
    inviteId: invite._id,
    message: "Joined via landlord invite for existing occupancy.",
    landlordNotes: "Auto-approved from landlord invitation.",
  });

  const lease = await buildLeaseFromListing({
    listing,
    tenantProfileId: tenantProfile._id,
    landlordProfileId: invite.landlordProfileId,
    applicationId: application._id,
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
  invite.applicationId = application._id;
  invite.legalAcknowledgedAt = new Date();
  invite.legalAcknowledgementText = legalText;
  await invite.save();

  await notifyUser({
    userId: String(invite.landlordUserId),
    type: "tenant.invite_accepted",
    title: "Tenant accepted your invite",
    body: `${invite.tenantName} accepted the invite for “${listing.title}” and was added to the property. Sign the agreement to activate the tenancy.`,
    link: "/portal/agreements",
  });

  await writeAudit({
    action: "tenant.invite_accept",
    summary: `${invite.tenantEmail} accepted invite for ${listing.title}`,
    actor: actorFromUser(user),
    entityType: "tenant_invite",
    entityId: String(invite._id),
    metadata: {
      leaseId: String(lease._id),
      applicationId: String(application._id),
      listingId: String(listing._id),
      legalAcknowledged: true,
    },
    request: req,
  });

  return NextResponse.json({
    leaseId: String(lease._id),
    applicationId: String(application._id),
    profileId: String(tenantProfile._id),
    listingId: String(listing._id),
  });
}
