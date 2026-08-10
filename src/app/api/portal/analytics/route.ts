import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { requireActiveProfile } from "@/lib/profile-context";
import { Listing } from "@/models/Listing";
import { Application } from "@/models/Application";
import { Payment } from "@/models/Payment";
import { Lease } from "@/models/Lease";
import { Profile } from "@/models/Profile";

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, [
    "landlord",
    "estate_manager",
  ]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  await connectDB();
  const profileIds = (
    await Profile.find({
      userId: user.id,
      type: { $in: ["landlord", "estate_manager"] },
    })
      .select("_id")
      .lean()
  ).map((p) => p._id);

  const listings = await Listing.find({
    ownerProfileId: { $in: profileIds },
  })
    .select("availabilityStatus")
    .lean();

  const byStatus: Record<string, number> = {
    available: 0,
    pending: 0,
    occupied: 0,
    draft: 0,
  };
  for (const l of listings) {
    byStatus[l.availabilityStatus] =
      (byStatus[l.availabilityStatus] || 0) + 1;
  }

  const totalListed = listings.length;
  const occupied = byStatus.occupied || 0;
  const occupancyRate =
    totalListed > 0 ? Math.round((occupied / totalListed) * 1000) / 10 : 0;

  const openApplications = await Application.countDocuments({
    landlordProfileId: { $in: profileIds },
    status: { $in: ["submitted", "under_review"] },
  });

  const listingIds = listings.map((l) => l._id);
  const rentAgg = await Payment.aggregate([
    {
      $match: {
        listingId: { $in: listingIds },
        status: "successful",
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const rentCollected = rentAgg[0]?.total || 0;

  const activeLeases = await Lease.find({
    landlordProfileId: { $in: profileIds },
    status: "active",
  })
    .select("rentAmount currency")
    .lean();

  const expectedMonthly = activeLeases.reduce(
    (s, l) => s + (l.rentAmount || 0),
    0
  );
  // Heuristic arrears: expected rent for active leases minus successful payments this month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const paidThisMonthAgg = await Payment.aggregate([
    {
      $match: {
        listingId: { $in: listingIds },
        status: "successful",
        paidAt: { $gte: monthStart },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const paidThisMonth = paidThisMonthAgg[0]?.total || 0;
  const arrearsEstimate = Math.max(0, expectedMonthly - paidThisMonth);

  return NextResponse.json({
    analytics: {
      listingsByStatus: byStatus,
      totalListings: totalListed,
      occupancyRate,
      applicationsOpen: openApplications,
      rentCollected,
      arrearsEstimate,
      expectedMonthlyRent: expectedMonthly,
      currency: "NGN",
    },
  });
}
