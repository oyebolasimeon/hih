import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import {
  requireActiveProfile,
  requireVerifiedProfile,
} from "@/lib/profile-context";
import { serializeListing } from "@/lib/listing-serialize";
import { actorFromUser, writeAudit } from "@/lib/audit";

const imageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().trim().optional(),
  isPrimary: z.boolean().optional(),
});

const createSchema = z.object({
  listingType: z.enum(["hostel", "house", "apartment", "commercial", "other"]),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(10000),
  address: z.object({
    street: z.string().trim().min(1).max(200),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().min(1).max(100),
    country: z.string().trim().min(1).max(100).default("Nigeria"),
    lat: z.number().optional(),
    lng: z.number().optional(),
  }),
  price: z.object({
    amount: z.number().positive(),
    currency: z.string().trim().min(1).max(8).default("NGN"),
    period: z.enum(["monthly", "yearly", "term"]),
  }),
  amenities: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(50).optional(),
  sizeSqm: z.number().positive().max(100000).optional(),
  images: z.array(imageSchema).max(20).default([]),
  availabilityStatus: z
    .enum(["available", "pending", "occupied", "draft"])
    .optional()
    .default("draft"),
});

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
  const rows = await Listing.find({
    $or: [
      { ownerProfileId: active.profile._id },
      { ownerUserId: user.id },
    ],
  })
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({
    listings: rows.map((r) => serializeListing(r)),
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
      { error: "Invalid listing data.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const availabilityStatus = data.availabilityStatus || "draft";
  const publishing = availabilityStatus === "available";

  const images =
    data.images.length > 0
      ? data.images.map((img, i) => ({
          url: img.url,
          publicId: img.publicId || "",
          isPrimary: img.isPrimary ?? i === 0,
        }))
      : [];

  await connectDB();
  const listing = await Listing.create({
    ownerProfileId: active.profile._id,
    ownerUserId: user.id,
    listingType: data.listingType,
    title: data.title,
    description: data.description,
    address: data.address,
    price: data.price,
    amenities: data.amenities,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    sizeSqm: data.sizeSqm,
    images,
    availabilityStatus,
    verificationStatus: publishing ? "pending" : "unverified",
    featured: false,
    publishedAt: publishing ? new Date() : undefined,
  });

  await writeAudit({
    action: "listing.create",
    summary: `Created listing "${listing.title}"`,
    actor: actorFromUser(user),
    entityType: "listing",
    entityId: String(listing._id),
    request: req,
    metadata: {
      availabilityStatus: listing.availabilityStatus,
      verificationStatus: listing.verificationStatus,
    },
  });

  return NextResponse.json(
    { listing: serializeListing(listing.toObject()) },
    { status: 201 }
  );
}
