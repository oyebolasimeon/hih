import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";
import { serializeListing } from "@/lib/listing-serialize";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/profile-context";

export async function GET(req: Request) {
  const { response } = await assertAdmin("listings:read");
  if (response) return response;

  await connectDB();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "pending";

  const filter: Record<string, unknown> = {};
  if (status && status !== "all") {
    filter.verificationStatus = status;
  }

  const rows = await Listing.find(filter)
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  const userIds = [...new Set(rows.map((r) => String(r.ownerUserId)))];
  const profileIds = [...new Set(rows.map((r) => String(r.ownerProfileId)))];
  const [users, profiles] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select("name email").lean(),
    Profile.find({ _id: { $in: profileIds } })
      .select("displayName type status")
      .lean(),
  ]);
  const userMap = new Map(users.map((u) => [String(u._id), u]));
  const profileMap = new Map(profiles.map((p) => [String(p._id), p]));

  return NextResponse.json({
    listings: rows.map((r) => {
      const u = userMap.get(String(r.ownerUserId));
      const p = profileMap.get(String(r.ownerProfileId));
      return {
        ...serializeListing(r, {
          ownerVerified: p?.status === "verified",
          ownerDisplayName: p?.displayName,
        }),
        ownerName: u?.name || "",
        ownerEmail: u?.email || "",
        ownerProfileType: p?.type || "",
      };
    }),
  });
}

const reviewSchema = z.object({
  id: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(2000).optional(),
});

export async function PATCH(req: Request) {
  const { user, response } = await assertAdmin("listings:verify");
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }

  if (!mongoose.Types.ObjectId.isValid(parsed.data.id)) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  await connectDB();
  const listing = await Listing.findById(parsed.data.id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  if (listing.verificationStatus !== "pending") {
    return NextResponse.json(
      { error: "Only pending listings can be reviewed." },
      { status: 409 }
    );
  }

  const approved = parsed.data.decision === "approve";
  listing.verificationStatus = approved ? "verified" : "rejected";
  if (!approved) {
    listing.availabilityStatus = "draft";
  } else if (!listing.publishedAt) {
    listing.publishedAt = new Date();
  }
  await listing.save();

  const owner = await User.findById(listing.ownerUserId).select("email name").lean();
  await notifyUser({
    userId: String(listing.ownerUserId),
    type: approved ? "listing.verified" : "listing.rejected",
    title: approved ? "Listing verified" : "Listing needs changes",
    body: approved
      ? `"${listing.title}" is verified and visible in search.`
      : `"${listing.title}" was rejected.${
          parsed.data.notes ? ` Note: ${parsed.data.notes}` : ""
        }`,
    link: "/portal/listings",
    email: owner?.email
      ? {
          to: owner.email,
          subject: approved
            ? "Your listing was verified"
            : "Your listing was rejected",
        }
      : undefined,
  });

  await writeAudit({
    action: approved ? "listing.approve" : "listing.reject",
    summary: `${approved ? "Approved" : "Rejected"} listing "${listing.title}"`,
    actor: actorFromUser({ ...user, isAdmin: true }),
    entityType: "listing",
    entityId: String(listing._id),
    request: req,
    metadata: { notes: parsed.data.notes || "" },
  });

  return NextResponse.json({
    listing: serializeListing(listing.toObject()),
  });
}
