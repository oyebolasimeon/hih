import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { serializePublicTeaser } from "@/lib/listing-serialize";

export async function GET() {
  await connectDB();

  const rows = await Listing.find({
    availabilityStatus: "available",
    verificationStatus: "verified",
  })
    .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
    .limit(12)
    .lean();

  return NextResponse.json({
    listings: rows.map(serializePublicTeaser),
  });
}
