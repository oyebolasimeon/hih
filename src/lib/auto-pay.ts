import mongoose from "mongoose";
import { randomBytes } from "crypto";
import { markPaymentSuccessful } from "@/lib/payment-complete";
import {
  formatRentPeriodLabel,
  getPayableRentPeriod,
} from "@/lib/rent-period";
import {
  paystackChargeAuthorization,
  type PaystackAuthorization,
} from "@/lib/paystack";
import { debitTenantWalletForRent, settleServiceDuePayment } from "@/lib/wallet";
import { AutoPaySetting } from "@/models/AutoPaySetting";
import { Lease } from "@/models/Lease";
import { Payment } from "@/models/Payment";
import { PaymentMethod } from "@/models/PaymentMethod";
import { PropertyService } from "@/models/PropertyService";
import { ServiceDueCharge } from "@/models/ServiceDueCharge";
import { User } from "@/models/User";
import { notifyUser } from "@/lib/profile-context";

const CARD_VERIFY_AMOUNT = 100;

function monthPeriodKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export async function savePaymentMethodFromAuthorization(input: {
  userId: string;
  profileId: mongoose.Types.ObjectId;
  email: string;
  authorization: PaystackAuthorization;
}) {
  if (!input.authorization.authorization_code) {
    throw new Error("Card authorization was not returned.");
  }

  await PaymentMethod.updateMany(
    { profileId: input.profileId, active: true },
    { isDefault: false }
  );

  const existing = await PaymentMethod.findOne({
    profileId: input.profileId,
    paystackAuthorizationCode: input.authorization.authorization_code,
  }).select("+paystackAuthorizationCode");

  if (existing) {
    existing.active = true;
    existing.isDefault = true;
    existing.cardType = input.authorization.card_type;
    existing.last4 = input.authorization.last4;
    existing.expMonth = input.authorization.exp_month;
    existing.expYear = input.authorization.exp_year;
    existing.bank = input.authorization.bank;
    await existing.save();
    return existing;
  }

  return PaymentMethod.create({
    userId: input.userId,
    profileId: input.profileId,
    paystackAuthorizationCode: input.authorization.authorization_code,
    paystackEmail: input.email,
    cardType: input.authorization.card_type,
    last4: input.authorization.last4,
    expMonth: input.authorization.exp_month,
    expYear: input.authorization.exp_year,
    bank: input.authorization.bank,
    isDefault: true,
    active: true,
  });
}

export function serializePaymentMethod(
  method: InstanceType<typeof PaymentMethod>
) {
  return {
    id: String(method._id),
    cardType: method.cardType || "card",
    last4: method.last4 || "****",
    expMonth: method.expMonth || null,
    expYear: method.expYear || null,
    bank: method.bank || null,
    isDefault: method.isDefault,
    createdAt: method.createdAt,
  };
}

export async function collectWithWalletThenCard(input: {
  tenantProfileId: mongoose.Types.ObjectId;
  tenantUserId: string;
  landlordProfileId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  paymentMethod: InstanceType<typeof PaymentMethod> | null;
  paymentDraft: {
    leaseId?: mongoose.Types.ObjectId;
    listingId?: mongoose.Types.ObjectId;
    purpose: "rent" | "service_due";
    providerRef: string;
    rentPeriodIndex?: number;
    rentPeriodStart?: Date;
    rentPeriodEnd?: Date;
    dueDate?: Date;
    serviceDueChargeId?: mongoose.Types.ObjectId;
  };
}) {
  const wallet = await debitTenantWalletForRent({
    profileId: input.tenantProfileId,
    userId: input.tenantUserId,
    maxDebit: input.amount,
  });

  const walletPaid = wallet.debited;
  const cardPaid = input.amount - walletPaid;

  if (cardPaid > 0) {
    if (!input.paymentMethod) {
      if (walletPaid > 0) {
        throw new Error(
          "Insufficient wallet balance and no saved card for the remainder."
        );
      }
      throw new Error("No saved card available for auto-pay.");
    }

    const method = await PaymentMethod.findById(input.paymentMethod._id).select(
      "+paystackAuthorizationCode"
    );
    if (!method?.paystackAuthorizationCode) {
      throw new Error("Saved card is no longer valid.");
    }

    await paystackChargeAuthorization({
      authorizationCode: method.paystackAuthorizationCode,
      email: method.paystackEmail,
      amountKobo: Math.round(cardPaid * 100),
      reference: `${input.paymentDraft.providerRef}_card`,
      metadata: {
        parentRef: input.paymentDraft.providerRef,
        walletPaid,
        cardPaid,
      },
    });
  }

  const source =
    walletPaid > 0 && cardPaid > 0
      ? "auto_pay"
      : walletPaid > 0
        ? "wallet"
        : "paystack";

  const payment = await Payment.create({
    leaseId: input.paymentDraft.leaseId,
    listingId: input.paymentDraft.listingId,
    payerUserId: input.tenantUserId,
    payerProfileId: input.tenantProfileId,
    payeeProfileId: input.landlordProfileId,
    amount: input.amount,
    currency: input.currency,
    status: "pending",
    provider: "paystack",
    purpose: input.paymentDraft.purpose,
    source,
    providerRef: input.paymentDraft.providerRef,
    rentPeriodIndex: input.paymentDraft.rentPeriodIndex,
    rentPeriodStart: input.paymentDraft.rentPeriodStart,
    rentPeriodEnd: input.paymentDraft.rentPeriodEnd,
    dueDate: input.paymentDraft.dueDate,
    walletPaidAmount: walletPaid,
    cardPaidAmount: cardPaid,
    isAutoPay: true,
    serviceDueChargeId: input.paymentDraft.serviceDueChargeId,
  });

  if (input.paymentDraft.purpose === "service_due") {
    payment.status = "successful";
    payment.paidAt = new Date();
    await payment.save();
    await settleServiceDuePayment(payment);
  } else {
    await markPaymentSuccessful(payment);
  }

  return { payment, walletPaid, cardPaid };
}

export async function processRentAutoPay(
  lease: InstanceType<typeof Lease>,
  setting: InstanceType<typeof AutoPaySetting>,
  paymentMethod: InstanceType<typeof PaymentMethod> | null
) {
  const payable = await getPayableRentPeriod(lease);
  if (payable.paid) {
    return { skipped: true, reason: "already_paid" };
  }

  const now = new Date();
  if (now < payable.periodStart) {
    return { skipped: true, reason: "not_due" };
  }

  const pending = await Payment.findOne({
    leaseId: lease._id,
    purpose: "rent",
    status: "pending",
    rentPeriodIndex: payable.periodIndex,
  }).select("_id");
  if (pending) {
    return { skipped: true, reason: "pending_payment" };
  }

  const reference = `hih_auto_${randomBytes(10).toString("hex")}`;
  const result = await collectWithWalletThenCard({
    tenantProfileId: lease.tenantProfileId,
    tenantUserId: String(setting.tenantUserId),
    landlordProfileId: lease.landlordProfileId,
    amount: lease.rentAmount,
    currency: lease.currency || "NGN",
    paymentMethod,
    paymentDraft: {
      leaseId: lease._id,
      listingId: lease.listingId,
      purpose: "rent",
      providerRef: reference,
      rentPeriodIndex: payable.periodIndex,
      rentPeriodStart: payable.periodStart,
      rentPeriodEnd: payable.periodEnd,
      dueDate: payable.periodEnd,
    },
  });

  const tenantUser = await User.findById(setting.tenantUserId)
    .select("email name")
    .lean();
  if (tenantUser) {
    await notifyUser({
      userId: String(setting.tenantUserId),
      type: "payment.auto_pay",
      title: "Rent auto-paid",
      body: `${lease.currency} ${lease.rentAmount.toLocaleString()} for ${formatRentPeriodLabel(payable.periodStart, payable.periodEnd)} was deducted automatically.`,
      link: "/portal/payments",
      meta: { paymentId: String(result.payment._id) },
      email: tenantUser.email
        ? {
            to: tenantUser.email,
            subject: "Rent auto-payment successful",
          }
        : undefined,
    });
  }

  return { success: true, paymentId: String(result.payment._id), ...result };
}

export async function ensureServiceDueCharges(
  lease: InstanceType<typeof Lease>,
  at: Date = new Date()
) {
  const services = await PropertyService.find({
    listingId: lease.listingId,
    active: true,
    billing: { $in: ["monthly", "yearly"] },
    price: { $gt: 0 },
  }).lean();

  const charges = [];
  for (const service of services) {
    const { start, end } = monthBounds(at);
    const key =
      service.billing === "yearly"
        ? String(at.getFullYear())
        : monthPeriodKey(at);

    const existing = await ServiceDueCharge.findOne({
      propertyServiceId: service._id,
      leaseId: lease._id,
      billingPeriodKey: key,
    });
    if (existing) {
      charges.push(existing);
      continue;
    }

    const due = await ServiceDueCharge.create({
      propertyServiceId: service._id,
      leaseId: lease._id,
      listingId: lease.listingId,
      tenantProfileId: lease.tenantProfileId,
      landlordProfileId: lease.landlordProfileId,
      serviceName: service.name,
      amount: service.price,
      currency: service.currency,
      billingPeriodKey: key,
      billingPeriodStart: start,
      billingPeriodEnd: end,
      dueDate: start,
      status: "pending",
    });
    charges.push(due);
  }
  return charges;
}

export async function processServiceDuesAutoPay(
  lease: InstanceType<typeof Lease>,
  setting: InstanceType<typeof AutoPaySetting>,
  paymentMethod: InstanceType<typeof PaymentMethod> | null,
  at: Date = new Date()
) {
  const charges = await ensureServiceDueCharges(lease, at);
  const dueCharges = charges.filter(
    (c) => c.status === "pending" && at >= c.dueDate
  );

  const results = [];
  for (const charge of dueCharges) {
    try {
      const reference = `hih_svc_${randomBytes(10).toString("hex")}`;
      const result = await collectWithWalletThenCard({
        tenantProfileId: lease.tenantProfileId,
        tenantUserId: String(setting.tenantUserId),
        landlordProfileId: lease.landlordProfileId,
        amount: charge.amount,
        currency: charge.currency,
        paymentMethod,
        paymentDraft: {
          leaseId: lease._id,
          listingId: lease.listingId,
          purpose: "service_due",
          providerRef: reference,
          dueDate: charge.dueDate,
          serviceDueChargeId: charge._id,
        },
      });

      results.push({ chargeId: String(charge._id), success: true, paymentId: String(result.payment._id) });
    } catch (err) {
      charge.status = "failed";
      await charge.save();
      results.push({
        chargeId: String(charge._id),
        success: false,
        error: err instanceof Error ? err.message : "Charge failed",
      });
    }
  }

  return results;
}

export async function processAutoPayForSetting(
  setting: InstanceType<typeof AutoPaySetting>
) {
  if (!setting.enabled) {
    return { skipped: true, reason: "disabled" };
  }

  const lease = await Lease.findById(setting.leaseId);
  if (!lease || lease.status !== "active") {
    setting.lastRunStatus = "skipped";
    setting.lastRunError = "Lease is not active.";
    setting.lastRunAt = new Date();
    await setting.save();
    return { skipped: true, reason: "inactive_lease" };
  }

  let paymentMethod: InstanceType<typeof PaymentMethod> | null = null;
  if (setting.paymentMethodId) {
    paymentMethod = await PaymentMethod.findById(setting.paymentMethodId);
  }
  if (!paymentMethod) {
    paymentMethod = await PaymentMethod.findOne({
      profileId: setting.tenantProfileId,
      active: true,
      isDefault: true,
    });
  }

  const results: Record<string, unknown> = {};

  try {
    if (setting.includeRent) {
      results.rent = await processRentAutoPay(lease, setting, paymentMethod);
    }
    if (setting.includeServiceDues) {
      results.services = await processServiceDuesAutoPay(
        lease,
        setting,
        paymentMethod
      );
    }

    setting.lastRunStatus = "success";
    setting.lastRunError = undefined;
    setting.lastRunAt = new Date();
    await setting.save();
    return { success: true, results };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Auto-pay failed.";
    setting.lastRunStatus = "failed";
    setting.lastRunError = message;
    setting.lastRunAt = new Date();
    await setting.save();

    await notifyUser({
      userId: String(setting.tenantUserId),
      type: "payment.auto_pay_failed",
      title: "Auto-pay failed",
      body: message,
      link: "/portal/payments",
    });

    throw err;
  }
}

export async function runDueAutoPayBatch() {
  const settings = await AutoPaySetting.find({ enabled: true });
  const summary = [];

  for (const setting of settings) {
    try {
      const result = await processAutoPayForSetting(setting);
      summary.push({ leaseId: String(setting.leaseId), ...result });
    } catch (err) {
      summary.push({
        leaseId: String(setting.leaseId),
        success: false,
        error: err instanceof Error ? err.message : "Failed",
      });
    }
  }

  return summary;
}

export { CARD_VERIFY_AMOUNT };
