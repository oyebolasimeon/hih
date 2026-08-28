import mongoose from "mongoose";
import {
  formatRentPeriodLabel,
  getPayableRentPeriod,
} from "@/lib/rent-period";
import { notifyUser } from "@/lib/profile-context";
import { ensureServiceDueCharges } from "@/lib/auto-pay";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";
import { RentReminderLog } from "@/models/RentReminderLog";
import { ServiceDueCharge } from "@/models/ServiceDueCharge";
import { User } from "@/models/User";

export const REMINDER_DAYS_BEFORE_DUE = 3;

function dateKey(date: Date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function daysUntil(date: Date, from: Date = new Date()) {
  return Math.ceil((date.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function daysOverdue(date: Date, from: Date = new Date()) {
  return Math.max(0, Math.floor((from.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatMoney(amount: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatListingAddress(
  address?: { street?: string; city?: string; state?: string } | null
) {
  if (!address) return undefined;
  const parts = [address.street, address.city, address.state].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : undefined;
}

export type RentStatusSummary = {
  paid: boolean;
  overdue: boolean;
  dueSoon: boolean;
  periodIndex: number;
  periodLabel: string;
  periodEnd: string;
  amount: number;
  currency: string;
  daysUntilDue: number;
  daysOverdue: number;
};

export type ServiceDueSummary = {
  chargeId: string;
  serviceName: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysOverdue: number;
  overdue: boolean;
};

export type DefaulterRow = {
  leaseId: string;
  tenant: { profileId: string; name: string; userId: string };
  listing: { id: string; title: string; address?: string };
  rent: RentStatusSummary | null;
  serviceDues: ServiceDueSummary[];
  isDefaulter: boolean;
};

async function wasReminderSent(dedupeKey: string) {
  return Boolean(await RentReminderLog.exists({ dedupeKey }));
}

async function logReminder(
  dedupeKey: string,
  kind: string,
  leaseId?: mongoose.Types.ObjectId
) {
  await RentReminderLog.create({ dedupeKey, kind, leaseId, sentAt: new Date() });
}

export async function getRentStatusSummary(
  lease: InstanceType<typeof Lease>,
  at: Date = new Date()
): Promise<RentStatusSummary> {
  const payable = await getPayableRentPeriod(lease);
  const untilDue = daysUntil(payable.periodEnd, at);
  const overdueDays = payable.expired && !payable.paid
    ? daysOverdue(payable.periodEnd, at)
    : 0;

  return {
    paid: payable.paid,
    overdue: !payable.paid && payable.expired,
    dueSoon: !payable.paid && !payable.expired && untilDue <= REMINDER_DAYS_BEFORE_DUE,
    periodIndex: payable.periodIndex,
    periodLabel: formatRentPeriodLabel(payable.periodStart, payable.periodEnd),
    periodEnd: payable.periodEnd.toISOString(),
    amount: lease.rentAmount,
    currency: lease.currency || "NGN",
    daysUntilDue: untilDue,
    daysOverdue: overdueDays,
  };
}

export async function getServiceDueSummaries(
  lease: InstanceType<typeof Lease>,
  at: Date = new Date()
): Promise<ServiceDueSummary[]> {
  await ensureServiceDueCharges(lease, at);
  const charges = await ServiceDueCharge.find({
    leaseId: lease._id,
    status: "pending",
  }).lean();

  return charges.map((charge) => ({
    chargeId: String(charge._id),
    serviceName: charge.serviceName,
    amount: charge.amount,
    currency: charge.currency,
    dueDate: charge.dueDate.toISOString(),
    daysOverdue: daysOverdue(charge.dueDate, at),
    overdue: at >= charge.dueDate,
  }));
}

export async function getDefaulterRowForLease(
  lease: InstanceType<typeof Lease>,
  at: Date = new Date()
): Promise<DefaulterRow | null> {
  const [tenantProfile, listing, rent, serviceDues] = await Promise.all([
    Profile.findById(lease.tenantProfileId).select("displayName userId").lean(),
    Listing.findById(lease.listingId).select("title address").lean(),
    getRentStatusSummary(lease, at),
    getServiceDueSummaries(lease, at),
  ]);

  if (!tenantProfile) return null;

  const overdueServices = serviceDues.filter((s) => s.overdue);
  const isDefaulter = rent.overdue || overdueServices.length > 0;

  return {
    leaseId: String(lease._id),
    tenant: {
      profileId: String(tenantProfile._id),
      name: tenantProfile.displayName,
      userId: String(tenantProfile.userId),
    },
    listing: {
      id: String(listing?._id || lease.listingId),
      title: listing?.title || "Property",
      address: formatListingAddress(listing?.address),
    },
    rent,
    serviceDues: overdueServices,
    isDefaulter,
  };
}

export async function getDefaultersForLandlordProfiles(
  landlordProfileIds: mongoose.Types.ObjectId[],
  options?: { includeDueSoon?: boolean; at?: Date }
) {
  const at = options?.at || new Date();
  const leases = await Lease.find({
    landlordProfileId: { $in: landlordProfileIds },
    status: "active",
  });

  const rows: DefaulterRow[] = [];
  for (const lease of leases) {
    const row = await getDefaulterRowForLease(lease, at);
    if (!row) continue;
    if (row.isDefaulter) {
      rows.push(row);
      continue;
    }
    if (options?.includeDueSoon && row.rent?.dueSoon) {
      rows.push(row);
    }
  }

  rows.sort((a, b) => {
    const aDays = a.rent?.daysOverdue || a.serviceDues[0]?.daysOverdue || 0;
    const bDays = b.rent?.daysOverdue || b.serviceDues[0]?.daysOverdue || 0;
    return bDays - aDays;
  });

  return rows;
}

async function notifyWithEmailPref(
  userId: string,
  input: {
    type: string;
    title: string;
    body: string;
    link?: string;
    meta?: Record<string, unknown>;
    emailSubject?: string;
  }
) {
  const user = await User.findById(userId).select("email emailNotifications name").lean();
  await notifyUser({
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    link: input.link,
    meta: input.meta,
    email:
      user?.email && user.emailNotifications !== false
        ? { to: user.email, subject: input.emailSubject || input.title }
        : undefined,
  });
}

export async function runRentReminderBatch(at: Date = new Date()) {
  const leases = await Lease.find({ status: "active" });
  const summary = {
    tenantDueSoon: 0,
    tenantOverdue: 0,
    tenantServiceOverdue: 0,
    landlordAlerts: 0,
    landlordDigests: 0,
    skipped: 0,
  };

  const landlordOverdueByUser = new Map<
    string,
    Array<{ tenantName: string; listingTitle: string; detail: string }>
  >();

  for (const lease of leases) {
    const row = await getDefaulterRowForLease(lease, at);
    if (!row) {
      summary.skipped += 1;
      continue;
    }

    const tenantUserId = row.tenant.userId;
    const landlordProfile = await Profile.findById(lease.landlordProfileId)
      .select("userId")
      .lean();
    const landlordUserId = landlordProfile ? String(landlordProfile.userId) : null;

    if (row.rent && !row.rent.paid && row.rent.dueSoon) {
      const dedupeKey = `tenant_due_soon:${lease._id}:${row.rent.periodIndex}`;
      if (!(await wasReminderSent(dedupeKey))) {
        await notifyWithEmailPref(tenantUserId, {
          type: "rent.reminder",
          title: "Rent due soon",
          body: `Your rent of ${formatMoney(row.rent.amount, row.rent.currency)} for ${row.listing.title} (${row.rent.periodLabel}) is due in ${row.rent.daysUntilDue} day(s). Pay from your portal to avoid late fees.`,
          link: "/portal/payments",
          meta: { leaseId: row.leaseId, periodIndex: row.rent.periodIndex },
          emailSubject: "Rent payment reminder — House In Hand",
        });
        await logReminder(dedupeKey, "tenant_due_soon", lease._id);
        summary.tenantDueSoon += 1;
      }
    }

    if (row.rent?.overdue) {
      const dedupeKey = `tenant_overdue:${lease._id}:${row.rent.periodIndex}:${dateKey(at)}`;
      if (!(await wasReminderSent(dedupeKey))) {
        await notifyWithEmailPref(tenantUserId, {
          type: "rent.overdue",
          title: "Rent overdue",
          body: `Your rent of ${formatMoney(row.rent.amount, row.rent.currency)} for ${row.listing.title} (${row.rent.periodLabel}) is ${row.rent.daysOverdue} day(s) overdue. Please pay as soon as possible.`,
          link: "/portal/payments",
          meta: { leaseId: row.leaseId, periodIndex: row.rent.periodIndex },
          emailSubject: "Overdue rent — action required",
        });
        await logReminder(dedupeKey, "tenant_overdue", lease._id);
        summary.tenantOverdue += 1;
      }

      if (landlordUserId) {
        const landlordOnceKey = `landlord_tenant_overdue:${lease._id}:${row.rent.periodIndex}`;
        if (!(await wasReminderSent(landlordOnceKey))) {
          await notifyWithEmailPref(landlordUserId, {
            type: "rent.defaulter",
            title: "Tenant rent overdue",
            body: `${row.tenant.name} at ${row.listing.title} is ${row.rent.daysOverdue} day(s) overdue on rent (${formatMoney(row.rent.amount, row.rent.currency)} for ${row.rent.periodLabel}).`,
            link: "/portal/payments",
            meta: { leaseId: row.leaseId, tenantProfileId: row.tenant.profileId },
            emailSubject: "Tenant rent overdue — House In Hand",
          });
          await logReminder(landlordOnceKey, "landlord_tenant_overdue", lease._id);
          summary.landlordAlerts += 1;
        }

        const bucket = landlordOverdueByUser.get(landlordUserId) || [];
        bucket.push({
          tenantName: row.tenant.name,
          listingTitle: row.listing.title,
          detail: `Rent ${row.rent.daysOverdue}d overdue (${formatMoney(row.rent.amount, row.rent.currency)})`,
        });
        landlordOverdueByUser.set(landlordUserId, bucket);
      }
    }

    for (const service of row.serviceDues.filter((s) => s.overdue)) {
      const dedupeKey = `tenant_service_overdue:${service.chargeId}:${dateKey(at)}`;
      if (!(await wasReminderSent(dedupeKey))) {
        await notifyWithEmailPref(tenantUserId, {
          type: "rent.service_overdue",
          title: "Service due overdue",
          body: `${service.serviceName} (${formatMoney(service.amount, service.currency)}) for ${row.listing.title} is ${service.daysOverdue} day(s) overdue.`,
          link: "/portal/payments",
          meta: { leaseId: row.leaseId, chargeId: service.chargeId },
          emailSubject: "Overdue service payment — House In Hand",
        });
        await logReminder(dedupeKey, "tenant_service_overdue", lease._id);
        summary.tenantServiceOverdue += 1;
      }

      if (landlordUserId) {
        const landlordOnceKey = `landlord_service_overdue:${service.chargeId}`;
        if (!(await wasReminderSent(landlordOnceKey))) {
          await notifyWithEmailPref(landlordUserId, {
            type: "rent.defaulter",
            title: "Tenant service due overdue",
            body: `${row.tenant.name} at ${row.listing.title} has an overdue ${service.serviceName} charge (${formatMoney(service.amount, service.currency)}, ${service.daysOverdue} day(s) late).`,
            link: "/portal/payments",
            meta: { leaseId: row.leaseId, chargeId: service.chargeId },
          });
          await logReminder(landlordOnceKey, "landlord_service_overdue", lease._id);
          summary.landlordAlerts += 1;
        }

        const bucket = landlordOverdueByUser.get(landlordUserId) || [];
        bucket.push({
          tenantName: row.tenant.name,
          listingTitle: row.listing.title,
          detail: `${service.serviceName} ${service.daysOverdue}d overdue`,
        });
        landlordOverdueByUser.set(landlordUserId, bucket);
      }
    }
  }

  for (const [landlordUserId, items] of landlordOverdueByUser) {
    if (items.length === 0) continue;
    const digestKey = `landlord_digest:${landlordUserId}:${dateKey(at)}`;
    if (await wasReminderSent(digestKey)) continue;

    const lines = items
      .slice(0, 8)
      .map((i) => `• ${i.tenantName} — ${i.listingTitle}: ${i.detail}`);
    const more = items.length > 8 ? `\n…and ${items.length - 8} more.` : "";

    await notifyWithEmailPref(landlordUserId, {
      type: "rent.defaulters_summary",
      title: `Payment defaulters (${items.length})`,
      body: `You have ${items.length} overdue tenant payment(s):\n${lines.join("\n")}${more}\n\nView details in your payments portal.`,
      link: "/portal/payments",
      meta: { count: items.length },
      emailSubject: `Daily defaulter summary — ${items.length} tenant(s)`,
    });
    await logReminder(digestKey, "landlord_digest");
    summary.landlordDigests += 1;
  }

  return summary;
}
