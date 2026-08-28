import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";
import { Lease } from "@/models/Lease";

import { formatRentPeriodLabel } from "@/lib/rent-period";

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const profiles = await Profile.find({ userId: user.id }).select("_id").lean();
  const profileIds = profiles.map((p) => p._id);

  const rows = await Payment.find({
    $or: [
      { payerUserId: user.id },
      { payeeProfileId: { $in: profileIds } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const leaseIds = [
    ...new Set(rows.filter((r) => r.leaseId).map((r) => String(r.leaseId))),
  ];
  const leases = await Lease.find({ _id: { $in: leaseIds } })
    .select("rentAmount currency listingId status")
    .lean();
  const leaseMap = new Map(leases.map((l) => [String(l._id), l]));

  const profileIdSet = new Set(profileIds.map((id) => String(id)));

  return NextResponse.json({
    payments: rows.map((p) => {
      const lease = p.leaseId ? leaseMap.get(String(p.leaseId)) : null;
      const purpose = p.purpose || (p.leaseId ? "rent" : null);
      const payeeProfileId = p.payeeProfileId ? String(p.payeeProfileId) : null;
      const canRefund =
        p.status === "successful" &&
        purpose === "rent" &&
        payeeProfileId != null &&
        profileIdSet.has(payeeProfileId);
      const rentPeriodLabel =
        p.rentPeriodStart && p.rentPeriodEnd
          ? formatRentPeriodLabel(
              new Date(p.rentPeriodStart),
              new Date(p.rentPeriodEnd)
            )
          : null;

      return {
        id: String(p._id),
        leaseId: p.leaseId ? String(p.leaseId) : null,
        listingId: p.listingId ? String(p.listingId) : null,
        payerUserId: String(p.payerUserId),
        payeeProfileId,
        amount: p.amount,
        grossAmount: p.grossAmount ?? p.amount,
        netPayeeAmount: p.netPayeeAmount ?? null,
        platformFeeAmount: p.platformFeeAmount ?? 0,
        currency: p.currency,
        status: p.status,
        purpose,
        source: p.source || "paystack",
        provider: p.provider,
        providerRef: p.providerRef || null,
        receiptUrl: p.receiptUrl || null,
        receiptNumber: p.receiptNumber || null,
        rentPeriodLabel,
        refundAmount: p.refundAmount ?? null,
        refundReason: p.refundReason || null,
        refundedAt: p.refundedAt || null,
        dueDate: p.dueDate || null,
        paidAt: p.paidAt || null,
        createdAt: p.createdAt,
        leaseStatus: lease?.status || null,
        canRefund,
      };
    }),
  });
}
