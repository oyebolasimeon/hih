import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";
import { serializeListing } from "@/lib/listing-serialize";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  await connectDB();
  const listing = await Listing.findById(id).lean();
  if (!listing || listing.availabilityStatus !== "available") {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const profile = await Profile.findById(listing.ownerProfileId)
    .select("status displayName type")
    .lean();

  return NextResponse.json({
    listing: serializeListing(listing, {
      ownerVerified: profile?.status === "verified",
      ownerDisplayName: profile?.displayName,
    }),
  });
}
