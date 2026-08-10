import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";
import { serializeListing } from "@/lib/listing-serialize";

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const city = (url.searchParams.get("city") || "").trim();
  const state = (url.searchParams.get("state") || "").trim();
  const listingType = (url.searchParams.get("listingType") || "").trim();
  const minPrice = Number(url.searchParams.get("minPrice") || "");
  const maxPrice = Number(url.searchParams.get("maxPrice") || "");
  const verifiedOnly =
    url.searchParams.get("verifiedOnly") === "1" ||
    url.searchParams.get("verifiedOnly") === "true";

  const filter: Record<string, unknown> = {
    availabilityStatus: "available",
  };

  if (city) filter["address.city"] = new RegExp(`^${escapeRegex(city)}$`, "i");
  if (state) filter["address.state"] = new RegExp(`^${escapeRegex(state)}$`, "i");
  if (
    listingType &&
    ["hostel", "house", "apartment", "commercial", "other"].includes(listingType)
  ) {
    filter.listingType = listingType;
  }
  if (verifiedOnly) filter.verificationStatus = "verified";

  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    const priceFilter: Record<string, number> = {};
    if (Number.isFinite(minPrice) && minPrice > 0) priceFilter.$gte = minPrice;
    if (Number.isFinite(maxPrice) && maxPrice > 0) priceFilter.$lte = maxPrice;
    if (Object.keys(priceFilter).length) filter["price.amount"] = priceFilter;
  }

  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { title: rx },
      { description: rx },
      { "address.city": rx },
      { "address.state": rx },
      { "address.street": rx },
      { amenities: rx },
    ];
  }

  const rows = await Listing.find(filter)
    .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
    .limit(60)
    .lean();

  const profileIds = [
    ...new Set(rows.map((r) => String(r.ownerProfileId))),
  ];
  const profiles = await Profile.find({ _id: { $in: profileIds } })
    .select("status displayName")
    .lean();
  const profileMap = new Map(profiles.map((p) => [String(p._id), p]));

  return NextResponse.json({
    listings: rows.map((r) => {
      const profile = profileMap.get(String(r.ownerProfileId));
      return serializeListing(r, {
        ownerVerified: profile?.status === "verified",
        ownerDisplayName: profile?.displayName,
      });
    }),
  });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
