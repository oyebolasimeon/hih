import { connectDB } from "@/lib/db";
import { getPayableRentPeriod } from "@/lib/rent-period";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";
import { UtilityBill } from "@/models/UtilityBill";
import { BuildingIssue } from "@/models/BuildingIssue";
import { ExitNotice } from "@/models/ExitNotice";
import { MaintenanceRequest } from "@/models/MaintenanceRequest";

export const PORTAL_ASSISTANT_SYSTEM = `You are the House In Hands AI Assistant inside the signed-in portal.
Help the user manage their property life on the platform: explain their leases/listings, find receipts and bills, forecast near-term spending from their payment history, recommend next actions, set reminders as suggested checklists, and answer property questions using their data.

Hard rules:
- This is NOT legal advice. Always include a short reminder that you do not provide legal advice and users should consult a qualified lawyer for legal matters.
- Never invent payments, receipts, balances, or lease terms. Use only USER_CONTEXT.
- If data is missing, say what they can open in the portal (Payments, My Home, Agreements, Utilities, Building issues, Exit notices).
- Be practical and action-oriented. Prefer short bullets and clear next steps.
- For landlords: collections, verification status, maintenance/building issues, exit notices.
- For tenants: rent due, receipts, utilities, maintenance/building issues, exit/home.
- Recommendations should be product-helpful (pay rent, upload proof, invite tenant, review pending listing) — not investment guarantees.`;

export async function buildPortalAssistantContext(userId: string) {
  await connectDB();
  const profiles = await Profile.find({ userId })
    .select("type displayName status")
    .lean();
  const profileIds = profiles.map((p) => p._id);

  const [leases, ownedListings, payments, utilities, issues, exits, maintenance] =
    await Promise.all([
      Lease.find({
        $or: [
          { tenantProfileId: { $in: profileIds } },
          { landlordProfileId: { $in: profileIds } },
        ],
      })
        .sort({ updatedAt: -1 })
        .limit(12)
        .lean(),
      Listing.find({ ownerUserId: userId })
        .sort({ updatedAt: -1 })
        .limit(12)
        .select(
          "title address price availabilityStatus verificationStatus aiRecommendation requiresManualReview"
        )
        .lean(),
      Payment.find({
        $or: [
          { payerUserId: userId },
          { payeeProfileId: { $in: profileIds } },
        ],
        status: { $in: ["successful", "refunded"] },
      })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean(),
      UtilityBill.find({ userId })
        .sort({ createdAt: -1 })
        .limit(15)
        .lean(),
      BuildingIssue.find({
        $or: [{ reporterUserId: userId }, { landlordUserId: userId }],
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      ExitNotice.find({
        $or: [
          { tenantProfileId: { $in: profileIds } },
          { landlordProfileId: { $in: profileIds } },
        ],
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      MaintenanceRequest.find({ requesterUserId: userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

  const listingIds = [
    ...new Set([
      ...leases.map((l) => String(l.listingId)),
      ...ownedListings.map((l) => String(l._id)),
    ]),
  ];
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title address")
    .lean();
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));

  const leaseLines: string[] = [];
  for (const lease of leases) {
    const listing = listingMap.get(String(lease.listingId));
    let rentDue = "n/a";
    try {
      const due = await getPayableRentPeriod(lease);
      rentDue = due.paid
        ? `paid through ${due.periodEnd.toISOString().slice(0, 10)}`
        : `unpaid period ${due.periodStart.toISOString().slice(0, 10)} → ${due.periodEnd.toISOString().slice(0, 10)}${due.expired ? " (overdue)" : ""}`;
    } catch {
      /* ignore */
    }
    leaseLines.push(
      [
        `- Lease ${String(lease._id).slice(-6)} · ${listing?.title || "Property"} · status ${lease.status}`,
        `  Rent ${lease.currency} ${lease.rentAmount}/${lease.paymentPeriod}`,
        `  Period due: ${rentDue}`,
        lease.documentUrl ? `  Agreement/receipt doc: ${lease.documentUrl}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  const paymentLines = payments.map((p) => {
    const purpose = p.purpose || (p.leaseId ? "rent" : "payment");
    return `- ${purpose} · ${p.currency} ${p.amount} · ${p.status} · ${new Date(p.createdAt).toISOString().slice(0, 10)}${p.receiptNumber ? ` · receipt ${p.receiptNumber}` : ""}${p._id ? ` · id ${String(p._id)}` : ""}`;
  });

  const spendByMonth = new Map<string, number>();
  for (const p of payments) {
    if (String(p.payerUserId) !== userId) continue;
    if (p.status !== "successful") continue;
    const key = new Date(p.createdAt).toISOString().slice(0, 7);
    spendByMonth.set(key, (spendByMonth.get(key) || 0) + Number(p.amount || 0));
  }
  const months = [...spendByMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const avgSpend =
    months.length > 0
      ? Math.round(months.reduce((s, [, v]) => s + v, 0) / months.length)
      : 0;

  const utilityLines = utilities.map(
    (b) =>
      `- ${b.category} · ${b.provider} · ${b.currency} ${b.amount} · ${b.status} · ${new Date(b.createdAt).toISOString().slice(0, 10)}`
  );

  const listingOwnerLines = ownedListings.map(
    (l) =>
      `- ${l.title} · ${l.address.city}, ${l.address.state} · ${l.availabilityStatus}/${l.verificationStatus}${l.requiresManualReview ? " · AI flagged for admin" : ""}${l.aiRecommendation ? ` · AI ${l.aiRecommendation}` : ""} · ${l.price.currency} ${l.price.amount}/${l.price.period}`
  );

  const issueLines = issues.map(
    (i) =>
      `- Building issue “${i.title}” · ${i.status} · ${i.priority} · ${i.aiRecommendation || "n/a"}`
  );
  const exitLines = exits.map(
    (e) =>
      `- Exit ${e.noticeType} · ${e.status} · vacate ${new Date(e.proposedVacateDate).toISOString().slice(0, 10)} · refund ${e.refundStatus}`
  );
  const maintLines = maintenance.map(
    (m) => `- Maintenance “${m.title}” · ${m.status} · ${m.priority}`
  );

  return [
    `Profiles: ${profiles.map((p) => `${p.type}:${p.status}`).join(", ") || "none"}`,
    "",
    "LEASES:",
    leaseLines.join("\n") || "None",
    "",
    "OWNED LISTINGS:",
    listingOwnerLines.join("\n") || "None",
    "",
    "RECENT PAYMENTS / RECEIPTS:",
    paymentLines.join("\n") || "None",
    "",
    `SPENDING FORECAST INPUTS: monthly averages from successful payer history ≈ NGN ${avgSpend.toLocaleString()} (or listing currency mix). Months: ${months
      .slice(-6)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ") || "n/a"}`,
    "",
    "UTILITIES:",
    utilityLines.join("\n") || "None",
    "",
    "BUILDING ISSUES:",
    issueLines.join("\n") || "None",
    "",
    "EXIT NOTICES:",
    exitLines.join("\n") || "None",
    "",
    "MAINTENANCE:",
    maintLines.join("\n") || "None",
    "",
    "Portal deep links: /portal/home /portal/payments /portal/utilities /portal/agreements /portal/building-issues /portal/exit-notices /portal/listings /portal/maintenance",
  ].join("\n");
}

export function findReceiptHint(context: string, query: string) {
  const m = query.match(/receipt\s*([A-Z0-9-]+)/i);
  if (!m) return null;
  if (context.toLowerCase().includes(m[1].toLowerCase())) {
    return `Receipt ${m[1]} appears in the user's payment history above. Open /portal/payments to download the PDF.`;
  }
  return `No payment with receipt ${m[1]} was found in recent history. Check /portal/payments.`;
}
