import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { requireActiveProfile } from "@/lib/profile-context";
import { Review } from "@/models/Review";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";

function serializeReview(
  r: Record<string, unknown>,
  extras?: { reviewerName?: string }
) {
  return {
    id: String(r._id),
    listingId: String(r.listingId),
    reviewerUserId: String(r.reviewerUserId),
    reviewerProfileId: String(r.reviewerProfileId),
    rating: r.rating,
    comment: r.comment || "",
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    reviewerName: extras?.reviewerName || null,
  };
}

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId");

  await connectDB();
  const filter: Record<string, unknown> = {};
  if (listingId) {
    if (!mongoose.Types.ObjectId.isValid(listingId)) {
      return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
    }
    filter.listingId = listingId;
  } else {
    filter.reviewerUserId = user.id;
  }

  const rows = await Review.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const profileIds = [...new Set(rows.map((r) => String(r.reviewerProfileId)))];
  const listingIds = [...new Set(rows.map((r) => String(r.listingId)))];
  const [profiles, listings] = await Promise.all([
    Profile.find({ _id: { $in: profileIds } }).select("displayName").lean(),
    Listing.find({ _id: { $in: listingIds } }).select("title").lean(),
  ]);
  const profileMap = new Map(profiles.map((p) => [String(p._id), p]));
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));

  const avg =
    rows.length > 0
      ? rows.reduce((s, r) => s + r.rating, 0) / rows.length
      : null;

  return NextResponse.json({
    reviews: rows.map((r) => ({
      ...serializeReview(r as unknown as Record<string, unknown>, {
        reviewerName:
          profileMap.get(String(r.reviewerProfileId))?.displayName || undefined,
      }),
      listingTitle: listingMap.get(String(r.listingId))?.title || null,
    })),
    averageRating: avg,
    count: rows.length,
  });
}

const createSchema = z.object({
  listingId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, ["tenant", "student"]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid review." },
      { status: 400 }
    );
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.listingId)) {
    return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  }

  await connectDB();
  const listing = await Listing.findById(parsed.data.listingId).lean();
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }
  if (String(listing.ownerUserId) === user.id) {
    return NextResponse.json(
      { error: "You cannot review your own listing." },
      { status: 400 }
    );
  }

  try {
    const review = await Review.create({
      listingId: parsed.data.listingId,
      reviewerUserId: user.id,
      reviewerProfileId: active.profile._id,
      rating: parsed.data.rating,
      comment: parsed.data.comment || "",
    });

    return NextResponse.json(
      {
        review: serializeReview(review.toObject() as unknown as Record<string, unknown>, {
          reviewerName: active.profile.displayName,
        }),
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 11000) {
      return NextResponse.json(
        { error: "You already reviewed this listing." },
        { status: 409 }
      );
    }
    throw err;
  }
}
