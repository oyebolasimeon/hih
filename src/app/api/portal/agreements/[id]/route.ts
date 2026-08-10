import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid agreement." }, { status: 400 });
  }

  await connectDB();
  const lease = await Lease.findById(id).lean();
  if (!lease) {
    return NextResponse.json({ error: "Agreement not found." }, { status: 404 });
  }

  const profiles = await Profile.find({ userId: user.id }).select("_id").lean();
  const profileIds = new Set(profiles.map((p) => String(p._id)));
  if (
    !profileIds.has(String(lease.tenantProfileId)) &&
    !profileIds.has(String(lease.landlordProfileId))
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const listing = await Listing.findById(lease.listingId)
    .select("title address price")
    .lean();

  return NextResponse.json({
    agreement: {
      id: String(lease._id),
      listingId: String(lease.listingId),
      tenantProfileId: String(lease.tenantProfileId),
      landlordProfileId: String(lease.landlordProfileId),
      applicationId: lease.applicationId ? String(lease.applicationId) : null,
      status: lease.status,
      startDate: lease.startDate,
      endDate: lease.endDate || null,
      rentAmount: lease.rentAmount,
      currency: lease.currency,
      paymentPeriod: lease.paymentPeriod,
      documentUrl: lease.documentUrl || null,
      termsText: lease.termsText || "",
      tenantSignatureName: lease.tenantSignatureName || "",
      landlordSignatureName: lease.landlordSignatureName || "",
      tenantSignedAt: lease.tenantSignedAt || null,
      landlordSignedAt: lease.landlordSignedAt || null,
      signedAt: lease.signedAt || null,
      createdAt: lease.createdAt,
      updatedAt: lease.updatedAt,
      listing: listing
        ? {
            id: String(listing._id),
            title: listing.title,
            city: listing.address?.city,
            state: listing.address?.state,
            price: listing.price,
          }
        : null,
    },
  });
}
