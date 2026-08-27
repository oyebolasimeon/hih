import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { Application } from "@/models/Application";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";
import type { IProfile } from "@/models/Profile";

export type PropertyOption = {
  listingId: string;
  title: string;
  city?: string;
  state?: string;
  leaseId?: string | null;
  role: "owner" | "tenant";
};

export type ReviewableListing = {
  listingId: string;
  title: string;
  city?: string;
  state?: string;
  context: "leased" | "applied";
  contextLabel: string;
  imageUrl?: string;
};

/** Homes the tenant/student has leased or applied to — eligible for reviews. */
export async function getReviewableListings(
  userId: string,
  profileId: mongoose.Types.ObjectId
): Promise<ReviewableListing[]> {
  await connectDB();

  const [leases, applications] = await Promise.all([
    Lease.find({
      tenantProfileId: profileId,
      status: { $in: ["active", "pending_signature", "terminated", "expired"] },
    })
      .select("listingId status")
      .sort({ updatedAt: -1 })
      .lean(),
    Application.find({
      applicantUserId: userId,
      status: { $in: ["submitted", "under_review", "approved", "rejected"] },
    })
      .select("listingId status")
      .sort({ updatedAt: -1 })
      .lean(),
  ]);

  const byListing = new Map<string, ReviewableListing>();

  for (const app of applications) {
    const id = String(app.listingId);
    if (!byListing.has(id)) {
      byListing.set(id, {
        listingId: id,
        title: "",
        context: "applied",
        contextLabel: `Applied · ${app.status.replace("_", " ")}`,
      });
    }
  }

  for (const lease of leases) {
    const id = String(lease.listingId);
    byListing.set(id, {
      listingId: id,
      title: "",
      context: "leased",
      contextLabel:
        lease.status === "active"
          ? "Current lease"
          : lease.status === "pending_signature"
            ? "Lease pending signatures"
            : `Stayed · ${lease.status.replace("_", " ")}`,
    });
  }

  const listingIds = [...byListing.keys()];
  if (!listingIds.length) return [];

  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title address images ownerUserId")
    .lean();

  const result: ReviewableListing[] = [];
  for (const listing of listings) {
    if (String(listing.ownerUserId) === userId) continue;
    const id = String(listing._id);
    const entry = byListing.get(id);
    if (!entry) continue;
    const images = (listing.images || []) as { isPrimary?: boolean; url?: string }[];
    const primary =
      images.find((i) => i.isPrimary)?.url || images[0]?.url || "";
    result.push({
      ...entry,
      title: listing.title,
      city: listing.address?.city,
      state: listing.address?.state,
      imageUrl: primary || undefined,
    });
  }

  return result.sort((a, b) => {
    if (a.context === b.context) return a.title.localeCompare(b.title);
    return a.context === "leased" ? -1 : 1;
  });
}

export async function assertReviewableListing(
  userId: string,
  profile: IProfile,
  listingId: string
): Promise<
  | { ok: true; listing: InstanceType<typeof Listing> }
  | { ok: false; error: string; status: number }
> {
  const eligible = await getReviewableListings(userId, profile._id);
  if (!eligible.some((l) => l.listingId === listingId)) {
    return {
      ok: false,
      error:
        "You can only review homes you have applied for or stayed in.",
      status: 403,
    };
  }
  const listing = await Listing.findById(listingId);
  if (!listing) {
    return { ok: false, error: "Listing not found.", status: 404 };
  }
  if (String(listing.ownerUserId) === userId) {
    return {
      ok: false,
      error: "You cannot review your own listing.",
      status: 400,
    };
  }
  return { ok: true, listing };
}

/** Listings the user owns (landlord/estate) or actively leases (tenant/student). */
export async function getAccessibleProperties(
  userId: string,
  profile: IProfile
): Promise<PropertyOption[]> {
  await connectDB();

  if (profile.type === "landlord" || profile.type === "estate_manager") {
    const listings = await Listing.find({ ownerUserId: userId })
      .select("title address")
      .sort({ updatedAt: -1 })
      .limit(100)
      .lean();
    return listings.map((l) => ({
      listingId: String(l._id),
      title: l.title,
      city: l.address?.city,
      state: l.address?.state,
      leaseId: null,
      role: "owner" as const,
    }));
  }

  const leases = await Lease.find({
    tenantProfileId: profile._id,
    status: { $in: ["active", "pending_signature"] },
  })
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  const listingIds = leases.map((l) => l.listingId);
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title address")
    .lean();
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));

  return leases
    .map((lease) => {
      const listing = listingMap.get(String(lease.listingId));
      if (!listing) return null;
      return {
        listingId: String(listing._id),
        title: listing.title,
        city: listing.address?.city,
        state: listing.address?.state,
        leaseId: String(lease._id),
        role: "tenant" as const,
      };
    })
    .filter(Boolean) as PropertyOption[];
}

export async function assertListingAccess(input: {
  userId: string;
  profile: IProfile;
  listingId: string;
  requireLeaseForTenant?: boolean;
}): Promise<
  | {
      ok: true;
      listing: InstanceType<typeof Listing>;
      leaseId?: string;
      role: "owner" | "tenant";
    }
  | { ok: false; error: string; status: number }
> {
  await connectDB();
  const listing = await Listing.findById(input.listingId);
  if (!listing) {
    return { ok: false, error: "Listing not found.", status: 404 };
  }

  if (String(listing.ownerUserId) === input.userId) {
    return { ok: true, listing, role: "owner" };
  }

  if (
    input.profile.type !== "tenant" &&
    input.profile.type !== "student"
  ) {
    return {
      ok: false,
      error: "You do not have access to this property.",
      status: 403,
    };
  }

  const lease = await Lease.findOne({
    listingId: listing._id,
    tenantProfileId: input.profile._id,
    status: { $in: ["active", "pending_signature"] },
  }).lean();

  if (!lease && input.requireLeaseForTenant !== false) {
    return {
      ok: false,
      error: "You need an active lease on this property.",
      status: 403,
    };
  }

  if (!lease) {
    return {
      ok: false,
      error: "You do not have access to this property.",
      status: 403,
    };
  }

  return {
    ok: true,
    listing,
    leaseId: String(lease._id),
    role: "tenant",
  };
}

export async function getUserProfileIds(userId: string) {
  await connectDB();
  const profiles = await Profile.find({ userId }).select("_id").lean();
  return profiles.map((p) => p._id);
}
