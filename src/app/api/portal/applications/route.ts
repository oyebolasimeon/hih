import { NextResponse } from "next/server";
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
import { Application } from "@/models/Application";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

function serializeApp(a: Record<string, unknown>) {
  return {
    id: String(a._id),
    listingId: String(a.listingId),
    applicantProfileId: String(a.applicantProfileId),
    applicantUserId: String(a.applicantUserId),
    landlordProfileId: String(a.landlordProfileId),
    message: a.message || "",
    status: a.status,
    landlordNotes: a.landlordNotes || "",
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const profiles = await Profile.find({ userId: user.id }).select("_id").lean();
  const profileIds = profiles.map((p) => p._id);

  const rows = await Application.find({
    $or: [
      { applicantUserId: user.id },
      { landlordProfileId: { $in: profileIds } },
      { applicantProfileId: { $in: profileIds } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const listingIds = [...new Set(rows.map((r) => String(r.listingId)))];
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title address price availabilityStatus")
    .lean();
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));

  return NextResponse.json({
    applications: rows.map((a) => {
      const listing = listingMap.get(String(a.listingId));
      return {
        ...serializeApp(a as unknown as Record<string, unknown>),
        listing: listing
          ? {
              id: String(listing._id),
              title: listing.title,
              city: listing.address?.city,
              state: listing.address?.state,
              price: listing.price,
              availabilityStatus: listing.availabilityStatus,
            }
          : null,
      };
    }),
  });
}

const createSchema = z.object({
  listingId: z.string().min(1),
  message: z.string().trim().max(2000).optional(),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, ["tenant", "student"]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }
  const verified = await requireVerifiedProfile(active.profile);
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
      { error: parsed.error.issues[0]?.message || "Invalid application." },
      { status: 400 }
    );
  }

  if (!mongoose.Types.ObjectId.isValid(parsed.data.listingId)) {
    return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  }

  await connectDB();
  const listing = await Listing.findById(parsed.data.listingId);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  if (listing.availabilityStatus !== "available") {
    return NextResponse.json(
      { error: "This listing is not available for applications." },
      { status: 409 }
    );
  }
  if (String(listing.ownerUserId) === user.id) {
    return NextResponse.json(
      { error: "You cannot apply to your own listing." },
      { status: 400 }
    );
  }

  const existing = await Application.findOne({
    listingId: listing._id,
    applicantProfileId: active.profile._id,
    status: { $in: ["submitted", "under_review", "approved"] },
  });
  if (existing) {
    return NextResponse.json(
      { error: "You already have an open application for this listing." },
      { status: 409 }
    );
  }

  const application = await Application.create({
    listingId: listing._id,
    applicantProfileId: active.profile._id,
    applicantUserId: user.id,
    landlordProfileId: listing.ownerProfileId,
    message: parsed.data.message || "",
    status: "submitted",
  });

  const landlord = await User.findById(listing.ownerUserId)
    .select("email name")
    .lean();
  if (landlord) {
    await notifyUser({
      userId: String(landlord._id),
      type: "application.received",
      title: "New rental application",
      body: `${active.profile.displayName || user.name || "A tenant"} applied to “${listing.title}”.`,
      link: "/portal/applications",
      meta: { applicationId: String(application._id), listingId: String(listing._id) },
      email: landlord.email
        ? { to: landlord.email, subject: "New rental application" }
        : undefined,
    });
  }

  await writeAudit({
    action: "application.create",
    summary: `Applied to listing ${listing.title}`,
    actor: actorFromUser(user),
    entityType: "application",
    entityId: String(application._id),
    metadata: { listingId: String(listing._id) },
    request: req,
  });

  return NextResponse.json(
    { application: serializeApp(application.toObject()) },
    { status: 201 }
  );
}
