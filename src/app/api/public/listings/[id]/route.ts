import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { serializePublicListing } from "@/lib/listing-serialize";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  await connectDB();
  const listing = await Listing.findOne({
    _id: id,
    availabilityStatus: { $in: ["available", "pending"] },
    verificationStatus: "verified",
  }).lean();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const owner = await Profile.findById(listing.ownerProfileId)
    .select("displayName status")
    .lean();

  return NextResponse.json({
    listing: serializePublicListing(listing, {
      ownerDisplayName: owner?.displayName,
      ownerVerified: owner?.status === "verified",
    }),
  });
}
