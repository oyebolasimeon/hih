import mongoose from "mongoose";
import { randomBytes } from "crypto";
import { paystackInitialize } from "@/lib/paystack";
import { ensureServiceDueCharges, collectWithWalletThenCard } from "@/lib/auto-pay";
import { getOrCreateWallet } from "@/lib/wallet";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { Payment } from "@/models/Payment";
import { PaymentMethod } from "@/models/PaymentMethod";
import { Profile } from "@/models/Profile";
import { ServiceDueCharge } from "@/models/ServiceDueCharge";
import { User } from "@/models/User";

export type ServiceDueRow = {
  id: string;
  leaseId: string;
  serviceName: string;
  amount: number;
  currency: string;
  dueDate: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  status: string;
  overdue: boolean;
  listingTitle: string;
};

export async function listPendingServiceDues(input: {
  tenantProfileId: mongoose.Types.ObjectId;
  leaseId?: string;
}) {
  const leaseQuery: Record<string, unknown> = {
    tenantProfileId: input.tenantProfileId,
    status: "active",
  };
  if (input.leaseId) {
    leaseQuery._id = input.leaseId;
  }

  const leases = await Lease.find(leaseQuery);
  const now = new Date();
  const rows: ServiceDueRow[] = [];

  for (const lease of leases) {
    await ensureServiceDueCharges(lease, now);
    const listing = await Listing.findById(lease.listingId).select("title").lean();
    const charges = await ServiceDueCharge.find({
      leaseId: lease._id,
      status: "pending",
    }).sort({ dueDate: 1 });

    for (const charge of charges) {
      rows.push({
        id: String(charge._id),
        leaseId: String(charge.leaseId),
        serviceName: charge.serviceName,
        amount: charge.amount,
        currency: charge.currency,
        dueDate: charge.dueDate.toISOString(),
        billingPeriodStart: charge.billingPeriodStart.toISOString(),
        billingPeriodEnd: charge.billingPeriodEnd.toISOString(),
        status: charge.status,
        overdue: now >= charge.dueDate,
        listingTitle: listing?.title || "Property",
      });
    }
  }

  return rows;
}

async function initializeServiceDuePaystack(
  charge: InstanceType<typeof ServiceDueCharge>,
  userId: string,
  email: string
) {
  const reference = `hih_svc_${randomBytes(10).toString("hex")}`;
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const callbackUrl = `${appUrl}/portal/payments?paid=1`;

  const payment = await Payment.create({
    leaseId: charge.leaseId,
    listingId: charge.listingId,
    payerUserId: userId,
    payerProfileId: charge.tenantProfileId,
    payeeProfileId: charge.landlordProfileId,
    amount: charge.amount,
    currency: charge.currency,
    status: "pending",
    provider: "paystack",
    purpose: "service_due",
    source: "paystack",
    providerRef: reference,
    dueDate: charge.dueDate,
    serviceDueChargeId: charge._id,
  });

  const init = await paystackInitialize({
    email,
    amountKobo: Math.round(charge.amount * 100),
    reference,
    callbackUrl,
    metadata: {
      paymentId: String(payment._id),
      chargeId: String(charge._id),
      userId,
      purpose: "service_due",
    },
  });

  return {
    instant: false as const,
    paymentId: String(payment._id),
    reference,
    authorization_url: init.authorization_url,
    mock: "mock" in init ? init.mock : false,
  };
}

export async function payServiceDueCharge(input: {
  chargeId: string;
  userId: string;
}) {
  if (!mongoose.Types.ObjectId.isValid(input.chargeId)) {
    throw new Error("Invalid service due.");
  }

  const charge = await ServiceDueCharge.findById(input.chargeId);
  if (!charge) {
    throw new Error("Service due not found.");
  }
  if (charge.status !== "pending") {
    throw new Error("This service due has already been paid.");
  }

  const tenantProfile = await Profile.findOne({
    _id: charge.tenantProfileId,
    userId: input.userId,
    type: { $in: ["tenant", "student"] },
  });
  if (!tenantProfile) {
    throw new Error("Forbidden.");
  }

  const pending = await Payment.findOne({
    serviceDueChargeId: charge._id,
    status: "pending",
  }).select("_id");
  if (pending) {
    throw new Error("A payment for this service due is already in progress.");
  }

  const dbUser = await User.findById(input.userId).select("email").lean();
  const email = dbUser?.email;
  if (!email) {
    throw new Error("Account email required.");
  }

  const paymentMethod = await PaymentMethod.findOne({
    profileId: charge.tenantProfileId,
    active: true,
    isDefault: true,
  });

  const wallet = await getOrCreateWallet(charge.tenantProfileId);
  const canPayInstantly =
    wallet.availableBalance >= charge.amount || Boolean(paymentMethod);

  if (!canPayInstantly) {
    return initializeServiceDuePaystack(charge, input.userId, email);
  }

  const reference = `hih_svc_${randomBytes(10).toString("hex")}`;

  const result = await collectWithWalletThenCard({
    tenantProfileId: charge.tenantProfileId,
    tenantUserId: input.userId,
    landlordProfileId: charge.landlordProfileId,
    amount: charge.amount,
    currency: charge.currency,
    paymentMethod,
    paymentDraft: {
      leaseId: charge.leaseId,
      listingId: charge.listingId,
      purpose: "service_due",
      providerRef: reference,
      dueDate: charge.dueDate,
      serviceDueChargeId: charge._id,
    },
  });

  return {
    instant: true as const,
    paymentId: String(result.payment._id),
    walletPaid: result.walletPaid,
    cardPaid: result.cardPaid,
  };
}
