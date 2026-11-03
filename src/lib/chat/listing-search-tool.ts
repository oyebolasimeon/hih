import { appUrl, APP_PATHS } from "@/lib/app-url";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";

export type ListingSearchInput = {
  city?: string;
  state?: string;
  listingType?: string;
  bedroomsMin?: number;
  maxRent?: number;
  query?: string;
  limit?: number;
};

export type PublicListingResult = {
  id: string;
  title: string;
  listingType: string;
  street: string;
  city: string;
  state: string;
  rentAmount: number;
  currency: string;
  period: string;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  summary: string;
  url: string;
};

/** OpenAI tool schema — public chat may ONLY call this property tool. */
export const SEARCH_LISTINGS_TOOL = {
  type: "function" as const,
  function: {
    name: "search_listings",
    description:
      "Search House In Hands verified public property listings available for rent. Use this whenever the user asks for homes, apartments, hostels, rentals, or properties in a city/state (e.g. Lagos, Abuja). Returns only public marketplace listings — never private user data.",
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "City filter, e.g. Lagos, Ikeja, Abuja",
        },
        state: {
          type: "string",
          description: "Nigerian state filter, e.g. Lagos, FCT, Rivers",
        },
        listingType: {
          type: "string",
          enum: ["hostel", "house", "apartment", "commercial", "other"],
          description: "Property type if specified",
        },
        bedroomsMin: {
          type: "number",
          description: "Minimum number of bedrooms",
        },
        maxRent: {
          type: "number",
          description: "Maximum rent amount in NGN (or listing currency)",
        },
        query: {
          type: "string",
          description:
            "Free-text keywords for title/description/amenities/neighbourhood",
        },
        limit: {
          type: "number",
          description: "Max results to return (default 8, max 15)",
        },
      },
    },
  },
};

/**
 * Query ONLY verified + available public listings.
 * No users, payments, leases, or private fields.
 */
export async function searchPublicListings(
  input: ListingSearchInput
): Promise<{ count: number; listings: PublicListingResult[] }> {
  await connectDB();

  const filter: Record<string, unknown> = {
    availabilityStatus: "available",
    verificationStatus: "verified",
  };

  if (input.city?.trim()) {
    filter["address.city"] = new RegExp(escapeRegex(input.city.trim()), "i");
  }
  if (input.state?.trim()) {
    filter["address.state"] = new RegExp(escapeRegex(input.state.trim()), "i");
  }
  if (input.listingType) {
    filter.listingType = input.listingType;
  }
  if (typeof input.bedroomsMin === "number" && !Number.isNaN(input.bedroomsMin)) {
    filter.bedrooms = { $gte: input.bedroomsMin };
  }
  if (typeof input.maxRent === "number" && input.maxRent > 0) {
    filter["price.amount"] = { $lte: input.maxRent };
  }

  const and: Record<string, unknown>[] = [filter];
  if (input.query?.trim()) {
    const q = escapeRegex(input.query.trim());
    and.push({
      $or: [
        { title: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { amenities: new RegExp(q, "i") },
        { "address.street": new RegExp(q, "i") },
        { "address.city": new RegExp(q, "i") },
        { "address.state": new RegExp(q, "i") },
      ],
    });
  }

  // If user said "Lagos" only in query with no city/state, broaden location match
  const locHint = guessLocationFromQuery(input);
  if (locHint && !input.city && !input.state) {
    and.push({
      $or: [
        { "address.city": new RegExp(escapeRegex(locHint), "i") },
        { "address.state": new RegExp(escapeRegex(locHint), "i") },
      ],
    });
  }

  const limit = Math.min(Math.max(input.limit || 8, 1), 15);
  const rows = await Listing.find(and.length === 1 ? filter : { $and: and })
    .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
    .limit(limit)
    .select(
      "title description address price listingType bedrooms bathrooms amenities"
    )
    .lean();

  // Fallback: if city filter returned nothing but query mentions a place, try looser search
  let results = rows;
  if (results.length === 0 && (input.city || input.state || locHint)) {
    const place = input.city || input.state || locHint || "";
    results = await Listing.find({
      availabilityStatus: "available",
      verificationStatus: "verified",
      $or: [
        { "address.city": new RegExp(escapeRegex(place), "i") },
        { "address.state": new RegExp(escapeRegex(place), "i") },
        { title: new RegExp(escapeRegex(place), "i") },
        { description: new RegExp(escapeRegex(place), "i") },
      ],
    })
      .sort({ featured: -1, publishedAt: -1 })
      .limit(limit)
      .select(
        "title description address price listingType bedrooms bathrooms amenities"
      )
      .lean();
  }

  return {
    count: results.length,
    listings: results.map((l) => ({
      id: String(l._id),
      title: l.title,
      listingType: l.listingType,
      street: l.address?.street || "",
      city: l.address?.city || "",
      state: l.address?.state || "",
      rentAmount: l.price?.amount ?? 0,
      currency: l.price?.currency || "NGN",
      period: l.price?.period || "yearly",
      bedrooms: l.bedrooms ?? null,
      bathrooms: l.bathrooms ?? null,
      amenities: (l.amenities || []).slice(0, 8),
      summary: (l.description || "").slice(0, 220),
      url: appUrl(APP_PATHS.listing(String(l._id))),
    })),
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function guessLocationFromQuery(input: ListingSearchInput) {
  const raw = `${input.city || ""} ${input.state || ""} ${input.query || ""}`.toLowerCase();
  const places = [
    "lagos",
    "abuja",
    "port harcourt",
    "ibadan",
    "kano",
    "enugu",
    "benin",
    "ikeja",
    "lekki",
    "vi",
    "victoria island",
    "yaba",
    "surulere",
    "ajah",
    "gwarinpa",
    "wuse",
    "fct",
  ];
  return places.find((p) => raw.includes(p));
}

export async function runPublicChatTool(
  name: string,
  argsJson: string
): Promise<string> {
  if (name !== "search_listings") {
    return JSON.stringify({
      error: "Tool not allowed. Only search_listings is available.",
    });
  }
  let args: ListingSearchInput = {};
  try {
    args = JSON.parse(argsJson || "{}") as ListingSearchInput;
  } catch {
    args = {};
  }
  const result = await searchPublicListings(args);
  return JSON.stringify(result);
}
