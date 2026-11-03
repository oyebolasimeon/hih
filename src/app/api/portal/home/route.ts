import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { requireActiveProfile } from "@/lib/profile-context";
import { Conversation } from "@/models/Conversation";
import { ExitNotice } from "@/models/ExitNotice";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";
import { UtilityBill } from "@/models/UtilityBill";
import { getPayableRentPeriod } from "@/lib/rent-period";

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, ["tenant", "student"]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  await connectDB();
  const profile = active.profile;

  const leases = await Lease.find({
    tenantProfileId: profile._id,
    status: { $in: ["active", "pending_signature", "terminated", "expired"] },
  })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  const listingIds = leases.map((l) => l.listingId);
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title address images price availabilityStatus")
    .lean();
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));

  const landlordIds = [...new Set(leases.map((l) => String(l.landlordProfileId)))];
  const landlords = await Profile.find({ _id: { $in: landlordIds } })
    .select("displayName kycVerifiedName userId")
    .lean();
  const landlordMap = new Map(landlords.map((p) => [String(p._id), p]));

  const leaseIds = leases.map((l) => l._id);
  const [payments, exitNotices, conversations, utilityBills] = await Promise.all([
    Payment.find({
      $or: [
        { leaseId: { $in: leaseIds } },
        { payerUserId: user.id, purpose: { $in: ["rent", "agreement_fee", "service_due"] } },
      ],
      status: { $in: ["successful", "refunded"] },
    })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean(),
    ExitNotice.find({
      tenantProfileId: profile._id,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    Conversation.find({
      participantUserIds: user.id,
      ...(listingIds.length
        ? { listingId: { $in: listingIds } }
        : {}),
    })
      .sort({ lastMessageAt: -1 })
      .limit(20)
      .lean(),
    UtilityBill.find({ userId: user.id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
  ]);

  const homes = [];
  for (const lease of leases) {
    const listing = listingMap.get(String(lease.listingId));
    const landlord = landlordMap.get(String(lease.landlordProfileId));
    const images = (listing?.images || []) as {
      url?: string;
      isPrimary?: boolean;
    }[];
    const imageUrl =
      images.find((i) => i.isPrimary)?.url || images[0]?.url || null;

    let rentDue = null as null | {
      periodIndex: number;
      periodStart: Date;
      periodEnd: Date;
      paid: boolean;
      expired: boolean;
    };
    try {
      rentDue = await getPayableRentPeriod(lease);
    } catch {
      rentDue = null;
    }

    const leasePayments = payments.filter(
      (p) => p.leaseId && String(p.leaseId) === String(lease._id)
    );
    const leaseExits = exitNotices.filter(
      (n) => String(n.leaseId) === String(lease._id)
    );
    const leaseConversations = conversations.filter(
      (c) => c.listingId && String(c.listingId) === String(lease.listingId)
    );

    homes.push({
      leaseId: String(lease._id),
      status: lease.status,
      source: lease.source || "application",
      startDate: lease.startDate,
      endDate: lease.endDate || null,
      rentAmount: lease.rentAmount,
      currency: lease.currency,
      paymentPeriod: lease.paymentPeriod,
      documentUrl: lease.documentUrl || null,
      documentNumber: lease.documentNumber || null,
      termsText: lease.termsText || "",
      signedAt: lease.signedAt || null,
      landlordName:
        landlord?.kycVerifiedName || landlord?.displayName || "Landlord",
      listing: listing
        ? {
            id: String(listing._id),
            title: listing.title,
            street: listing.address?.street,
            city: listing.address?.city,
            state: listing.address?.state,
            availabilityStatus: listing.availabilityStatus,
            imageUrl,
            price: listing.price,
          }
        : null,
      rentDue,
      recentPayments: leasePayments.slice(0, 8).map((p) => ({
        id: String(p._id),
        amount: p.amount,
        currency: p.currency,
        purpose: p.purpose || "rent",
        status: p.status,
        createdAt: p.createdAt,
        receiptNumber: p.receiptNumber || null,
      })),
      exitNotices: leaseExits.slice(0, 5).map((n) => ({
        id: String(n._id),
        status: n.status,
        noticeType: n.noticeType,
        proposedVacateDate: n.proposedVacateDate,
        documentNumber: n.documentNumber || null,
        documentUrl: n.documentUrl || null,
        refundStatus: n.refundStatus,
      })),
      conversations: leaseConversations.slice(0, 5).map((c) => ({
        id: String(c._id),
        lastMessageAt: c.lastMessageAt || c.updatedAt,
        listingId: c.listingId ? String(c.listingId) : null,
      })),
      documents: [
        lease.documentUrl
          ? {
              kind: "tenancy_agreement",
              label: lease.documentNumber || "Tenancy agreement",
              url: lease.documentUrl,
            }
          : null,
        ...leaseExits
          .filter((n) => n.documentUrl)
          .map((n) => ({
            kind: "exit_notice",
            label: n.documentNumber || "Exit notice",
            url: n.documentUrl as string,
          })),
      ].filter(Boolean),
      history: [
        {
          at: lease.createdAt,
          label: "Lease created",
          detail: lease.source === "landlord_invite" ? "Via landlord invite" : "From application",
        },
        lease.tenantSignedAt
          ? { at: lease.tenantSignedAt, label: "You signed", detail: "" }
          : null,
        lease.landlordSignedAt
          ? { at: lease.landlordSignedAt, label: "Landlord signed", detail: "" }
          : null,
        lease.signedAt
          ? { at: lease.signedAt, label: "Agreement active", detail: "" }
          : null,
        ...leaseExits.map((n) => ({
          at: n.createdAt,
          label: `Exit notice · ${n.status}`,
          detail: n.noticeType.replace(/_/g, " "),
        })),
        ...leasePayments.slice(0, 6).map((p) => ({
          at: p.createdAt,
          label: `Payment · ${p.purpose || "rent"}`,
          detail: `${p.currency} ${Number(p.amount).toLocaleString()} · ${p.status}`,
        })),
      ]
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b!.at as Date).getTime() - new Date(a!.at as Date).getTime()
        )
        .slice(0, 20),
    });
  }

  return NextResponse.json({
    homes,
    utilityBills: utilityBills.map((b) => ({
      id: String(b._id),
      service: `${b.category}${b.provider ? ` · ${b.provider}` : ""}`,
      amount: b.amount,
      currency: b.currency || "NGN",
      status: b.status,
      createdAt: b.createdAt,
    })),
  });
}
