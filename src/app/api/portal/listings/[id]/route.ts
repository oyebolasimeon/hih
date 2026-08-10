import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { serializeListing } from "@/lib/listing-serialize";
import { actorFromUser, writeAudit } from "@/lib/audit";

const imageSchema = z.object({
  url: z.string().url(),
  publicId: z.string().trim().optional(),
  isPrimary: z.boolean().optional(),
});

const patchSchema = z.object({
  listingType: z
    .enum(["hostel", "house", "apartment", "commercial", "other"])
    .optional(),
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().min(10).max(10000).optional(),
  address: z
    .object({
      street: z.string().trim().min(1).max(200),
      city: z.string().trim().min(1).max(100),
      state: z.string().trim().min(1).max(100),
      country: z.string().trim().min(1).max(100).default("Nigeria"),
      lat: z.number().optional(),
      lng: z.number().optional(),
    })
    .optional(),
  price: z
    .object({
      amount: z.number().positive(),
      currency: z.string().trim().min(1).max(8).default("NGN"),
      period: z.enum(["monthly", "yearly", "term"]),
    })
    .optional(),
  amenities: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  bedrooms: z.number().int().min(0).max(50).nullable().optional(),
  bathrooms: z.number().int().min(0).max(50).nullable().optional(),
  sizeSqm: z.number().positive().max(100000).nullable().optional(),
  images: z.array(imageSchema).max(20).optional(),
  availabilityStatus: z
    .enum(["available", "pending", "occupied", "draft"])
    .optional(),
});

async function loadOwnedListing(id: string, userId: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();
  return Listing.findOne({ _id: id, ownerUserId: userId });
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await context.params;
  const listing = await loadOwnedListing(id, user.id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  return NextResponse.json({
    listing: serializeListing(listing.toObject()),
  });
}

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await context.params;
  const listing = await loadOwnedListing(id, user.id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid listing update.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const before = {
    title: listing.title,
    availabilityStatus: listing.availabilityStatus,
    verificationStatus: listing.verificationStatus,
  };

  if (data.listingType !== undefined) listing.listingType = data.listingType;
  if (data.title !== undefined) listing.title = data.title;
  if (data.description !== undefined) listing.description = data.description;
  if (data.address !== undefined) listing.address = data.address;
  if (data.price !== undefined) listing.price = data.price;
  if (data.amenities !== undefined) listing.amenities = data.amenities;
  if (data.bedrooms !== undefined) {
    listing.bedrooms = data.bedrooms === null ? undefined : data.bedrooms;
  }
  if (data.bathrooms !== undefined) {
    listing.bathrooms = data.bathrooms === null ? undefined : data.bathrooms;
  }
  if (data.sizeSqm !== undefined) {
    listing.sizeSqm = data.sizeSqm === null ? undefined : data.sizeSqm;
  }
  if (data.images !== undefined) {
    listing.images = data.images.map((img, i) => ({
      url: img.url,
      publicId: img.publicId || "",
      isPrimary: img.isPrimary ?? i === 0,
    }));
  }

  if (data.availabilityStatus !== undefined) {
    listing.availabilityStatus = data.availabilityStatus;
    if (data.availabilityStatus === "available") {
      listing.verificationStatus = "pending";
      if (!listing.publishedAt) listing.publishedAt = new Date();
    }
  }

  await listing.save();

  await writeAudit({
    action:
      data.availabilityStatus === "available"
        ? "listing.publish"
        : "listing.update",
    summary: `Updated listing "${listing.title}"`,
    actor: actorFromUser(user),
    entityType: "listing",
    entityId: String(listing._id),
    request: req,
    metadata: { before, after: {
      title: listing.title,
      availabilityStatus: listing.availabilityStatus,
      verificationStatus: listing.verificationStatus,
    } },
  });

  return NextResponse.json({
    listing: serializeListing(listing.toObject()),
  });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await context.params;
  const listing = await loadOwnedListing(id, user.id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const title = listing.title;
  const listingId = String(listing._id);
  await listing.deleteOne();

  await writeAudit({
    action: "listing.delete",
    summary: `Deleted listing "${title}"`,
    actor: actorFromUser(user),
    entityType: "listing",
    entityId: listingId,
    request: req,
  });

  return NextResponse.json({ ok: true });
}
