import type {
  IListing,
  IListingAddress,
  IListingImage,
  IListingPrice,
} from "@/models/Listing";

export type ListingLean = {
  _id: unknown;
  ownerProfileId: unknown;
  ownerUserId: unknown;
  listingType: string;
  title: string;
  description: string;
  address: IListingAddress;
  price: IListingPrice;
  amenities?: string[];
  images?: IListingImage[];
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  availabilityStatus: string;
  verificationStatus: string;
  featured?: boolean;
  publishedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export function serializeListing(
  doc: ListingLean | IListing,
  extras?: {
    ownerVerified?: boolean;
    ownerDisplayName?: string;
  }
) {
  return {
    id: String(doc._id),
    ownerProfileId: String(doc.ownerProfileId),
    ownerUserId: String(doc.ownerUserId),
    listingType: doc.listingType,
    title: doc.title,
    description: doc.description,
    address: doc.address,
    price: doc.price,
    amenities: doc.amenities || [],
    images: (doc.images || []).map((img) => ({
      url: img.url,
      publicId: img.publicId || "",
      isPrimary: Boolean(img.isPrimary),
      mediaType: img.mediaType === "video" ? "video" : "image",
    })),
    bedrooms: doc.bedrooms ?? null,
    bathrooms: doc.bathrooms ?? null,
    sizeSqm: doc.sizeSqm ?? null,
    availabilityStatus: doc.availabilityStatus,
    verificationStatus: doc.verificationStatus,
    featured: Boolean(doc.featured),
    publishedAt: doc.publishedAt || null,
    legalSettings: (doc as { legalSettings?: unknown }).legalSettings || {
      provider: "hih",
    },
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    ownerVerified: extras?.ownerVerified ?? false,
    ownerDisplayName: extras?.ownerDisplayName || undefined,
  };
}

function publicMedia(doc: ListingLean) {
  return (doc.images || []).map((img) => ({
    url: img.url,
    isPrimary: Boolean(img.isPrimary),
    mediaType: (img.mediaType === "video" ? "video" : "image") as
      | "image"
      | "video",
  }));
}

function publicCoverUrl(doc: ListingLean) {
  const media = publicMedia(doc);
  const primaryImage =
    media.find((i) => i.isPrimary && i.mediaType !== "video") ||
    media.find((i) => i.mediaType !== "video") ||
    media.find((i) => i.isPrimary) ||
    media[0];
  return primaryImage?.url || "";
}

/** Public card teaser — no owner PII */
export function serializePublicTeaser(doc: ListingLean) {
  return {
    id: String(doc._id),
    listingType: doc.listingType,
    title: doc.title,
    description:
      doc.description.length > 180
        ? `${doc.description.slice(0, 177)}…`
        : doc.description,
    city: doc.address?.city || "",
    state: doc.address?.state || "",
    street: doc.address?.street || "",
    price: doc.price,
    bedrooms: doc.bedrooms ?? null,
    bathrooms: doc.bathrooms ?? null,
    sizeSqm: doc.sizeSqm ?? null,
    amenities: doc.amenities || [],
    imageUrl: publicCoverUrl(doc),
    imageCount: (doc.images || []).length,
    verificationStatus: doc.verificationStatus,
    featured: Boolean(doc.featured),
  };
}

/** Full public listing detail — property info only, no owner contact/PII */
export function serializePublicListing(
  doc: ListingLean,
  extras?: { ownerDisplayName?: string; ownerVerified?: boolean }
) {
  return {
    id: String(doc._id),
    listingType: doc.listingType,
    title: doc.title,
    description: doc.description,
    address: {
      street: doc.address?.street || "",
      city: doc.address?.city || "",
      state: doc.address?.state || "",
      country: doc.address?.country || "Nigeria",
    },
    price: doc.price,
    amenities: doc.amenities || [],
    images: publicMedia(doc),
    bedrooms: doc.bedrooms ?? null,
    bathrooms: doc.bathrooms ?? null,
    sizeSqm: doc.sizeSqm ?? null,
    availabilityStatus: doc.availabilityStatus,
    verificationStatus: doc.verificationStatus,
    featured: Boolean(doc.featured),
    publishedAt: doc.publishedAt || null,
    ownerDisplayName: extras?.ownerDisplayName || undefined,
    ownerVerified: extras?.ownerVerified ?? false,
  };
}
