import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { serializeListing } from "@/lib/listing-serialize";
import { Application } from "@/models/Application";
import { Listing } from "@/models/Listing";

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();

  const apps = await Application.find({ applicantUserId: user.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("listingId")
    .lean();

  const priorListingIds = apps.map((a) => a.listingId);
  let preferredCities: string[] = [];

  if (priorListingIds.length) {
    const prior = await Listing.find({ _id: { $in: priorListingIds } })
      .select("address.city")
      .lean();
    const counts = new Map<string, number>();
    for (const l of prior) {
      const city = l.address?.city?.trim();
      if (!city) continue;
      counts.set(city, (counts.get(city) || 0) + 1);
    }
    preferredCities = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c)
      .slice(0, 3);
  }

  const excludeIds = priorListingIds;
  const cityFilter =
    preferredCities.length > 0
      ? { "address.city": { $in: preferredCities } }
      : {};

  let listings = await Listing.find({
    availabilityStatus: "available",
    verificationStatus: "verified",
    ownerUserId: { $ne: user.id },
    _id: { $nin: excludeIds },
    ...cityFilter,
  })
    .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
    .limit(8)
    .lean();

  if (listings.length < 8) {
    const more = await Listing.find({
      availabilityStatus: "available",
      verificationStatus: "verified",
      ownerUserId: { $ne: user.id },
      _id: {
        $nin: [...excludeIds, ...listings.map((l) => l._id)],
      },
    })
      .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
      .limit(8 - listings.length)
      .lean();
    listings = [...listings, ...more];
  }

  return NextResponse.json({
    recommendations: listings.map((l) => serializeListing(l)),
    preferredCities,
    reason:
      preferredCities.length > 0
        ? `Based on your activity in ${preferredCities.join(", ")}`
        : "Popular verified listings available now",
  });
}
