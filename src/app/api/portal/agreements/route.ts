import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";

function serializeLease(
  l: Record<string, unknown>,
  listing: Record<string, unknown> | null | undefined,
  profileIds: Set<string>
) {
  const tenantProfileId = String(l.tenantProfileId);
  const landlordProfileId = String(l.landlordProfileId);
  const isTenant = profileIds.has(tenantProfileId);
  const isLandlord = profileIds.has(landlordProfileId);
  const viewerRole = isTenant && isLandlord
    ? "both"
    : isTenant
      ? "tenant"
      : isLandlord
        ? "landlord"
        : null;

  return {
    id: String(l._id),
    listingId: String(l.listingId),
    tenantProfileId,
    landlordProfileId,
    applicationId: l.applicationId ? String(l.applicationId) : null,
    status: l.status,
    startDate: l.startDate,
    endDate: l.endDate || null,
    rentAmount: l.rentAmount,
    currency: l.currency,
    paymentPeriod: l.paymentPeriod,
    documentUrl: l.documentUrl || null,
    termsText: l.termsText || "",
    tenantSignatureName: l.tenantSignatureName || "",
    landlordSignatureName: l.landlordSignatureName || "",
    tenantSignedAt: l.tenantSignedAt || null,
    landlordSignedAt: l.landlordSignedAt || null,
    signedAt: l.signedAt || null,
    legalProvider: l.legalProvider || "hih",
    legalCompanyName: l.legalCompanyName || "",
    agreementFeePercent: l.agreementFeePercent ?? 10,
    agreementFeeAmount: l.agreementFeeAmount ?? 0,
    agreementFeePaidAt: l.agreementFeePaidAt || null,
    documentNumber: l.documentNumber || null,
    viewerRole,
    canSignAsTenant:
      isTenant &&
      !l.tenantSignedAt &&
      ["draft", "pending_signature"].includes(String(l.status)),
    canSignAsLandlord:
      isLandlord &&
      !l.landlordSignedAt &&
      ["draft", "pending_signature"].includes(String(l.status)),
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
    listing: listing
      ? {
          id: String(listing._id),
          title: listing.title,
          city: (listing.address as { city?: string } | undefined)?.city,
          state: (listing.address as { state?: string } | undefined)?.state,
        }
      : null,
  };
}

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const profiles = await Profile.find({ userId: user.id }).select("_id").lean();
  const profileObjectIds = profiles.map((p) => p._id);
  const profileIdSet = new Set(profiles.map((p) => String(p._id)));

  const rows = await Lease.find({
    $or: [
      { tenantProfileId: { $in: profileObjectIds } },
      { landlordProfileId: { $in: profileObjectIds } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const listingIds = [...new Set(rows.map((r) => String(r.listingId)))];
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title address")
    .lean();
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));

  return NextResponse.json({
    agreements: rows.map((l) =>
      serializeLease(
        l as unknown as Record<string, unknown>,
        listingMap.get(String(l.listingId)) as unknown as Record<
          string,
          unknown
        > | null,
        profileIdSet
      )
    ),
  });
}
