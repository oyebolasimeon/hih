import mongoose from "mongoose";
import { randomBytes } from "crypto";
import { computeAgreementFee, getPlatformFees } from "@/lib/platform-fees";
import { paystackInitialize, paystackVerify } from "@/lib/paystack";
import { Lease } from "@/models/Lease";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

const PENDING_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function computeLeaseAgreementCharge(lease: InstanceType<typeof Lease>) {
  const fees = await getPlatformFees();
  const agreementFee = computeAgreementFee(
    lease.rentAmount,
    fees.agreementFeePercent,
    lease.agreementFeePercent
  );
  // Platform fee on own_legal is configured separately; agreement checkout is agreement fee only.
  const platformFee = 0;
  const totalDue = agreementFee + platformFee;
  return {
    fees,
    agreementFee,
    platformFee,
    totalDue,
  };
}

/** Mark lease fee paid when a successful payment exists but the lease flag was missed. */
export async function ensureAgreementFeeMarkedPaid(
  leaseId: mongoose.Types.ObjectId | string
) {
  const lease = await Lease.findById(leaseId);
  if (!lease) return null;
  if (lease.agreementFeePaidAt) return lease;

  const successful = await Payment.findOne({
    leaseId: lease._id,
    purpose: "agreement_fee",
    status: "successful",
  }).sort({ paidAt: -1 });

  if (!successful) return lease;

  await Lease.findByIdAndUpdate(lease._id, {
    $set: {
      agreementFeePaidAt: successful.paidAt || new Date(),
      agreementFeePaymentId: successful._id,
    },
  });
  lease.agreementFeePaidAt = successful.paidAt || new Date();
  lease.agreementFeePaymentId = successful._id;
  return lease;
}

export class AgreementFeeAlreadyPaidError extends Error {
  code = "AGREEMENT_FEE_ALREADY_PAID" as const;
  constructor() {
    super("Agreement fee has already been paid. You can sign the agreement now.");
    this.name = "AgreementFeeAlreadyPaidError";
  }
}

async function tryCompletePendingAgreementFee(
  pending: InstanceType<typeof Payment>
) {
  if (!pending.providerRef) return false;
  try {
    const verified = await paystackVerify(pending.providerRef);
    if (verified.status === "success") {
      const { markPaymentSuccessful } = await import("@/lib/payment-complete");
      await markPaymentSuccessful(pending);
      return true;
    }
  } catch {
    /* treat as not paid yet */
  }
  return false;
}

export async function initializeAgreementFeePayment(input: {
  leaseId: mongoose.Types.ObjectId;
  userId: string;
  email: string;
  callbackUrl: string;
}) {
  let lease = await Lease.findById(input.leaseId);
  if (!lease) throw new Error("Agreement not found.");

  lease = (await ensureAgreementFeeMarkedPaid(lease._id)) || lease;

  if (lease.agreementFeePaidAt) {
    throw new AgreementFeeAlreadyPaidError();
  }

  const successful = await Payment.findOne({
    leaseId: lease._id,
    purpose: "agreement_fee",
    status: "successful",
  });
  if (successful) {
    await Lease.findByIdAndUpdate(lease._id, {
      $set: {
        agreementFeePaidAt: successful.paidAt || new Date(),
        agreementFeePaymentId: successful._id,
      },
    });
    throw new AgreementFeeAlreadyPaidError();
  }

  const tenantProfile = await Profile.findOne({
    _id: lease.tenantProfileId,
    userId: input.userId,
  });
  if (!tenantProfile) {
    throw new Error("Only the tenant can pay the agreement fee.");
  }

  const { agreementFee, platformFee, totalDue } =
    await computeLeaseAgreementCharge(lease);

  if (totalDue <= 0) {
    await Lease.findByIdAndUpdate(lease._id, {
      $set: { agreementFeePaidAt: new Date(), agreementFeeAmount: 0 },
    });
    throw new AgreementFeeAlreadyPaidError();
  }

  const pending = await Payment.findOne({
    leaseId: lease._id,
    purpose: "agreement_fee",
    status: "pending",
  }).sort({ createdAt: -1 });

  if (pending) {
    const completed = await tryCompletePendingAgreementFee(pending);
    if (completed) {
      throw new AgreementFeeAlreadyPaidError();
    }

    const age = Date.now() - new Date(pending.createdAt).getTime();
    if (age < PENDING_TTL_MS) {
      throw new Error(
        "An agreement fee payment is already in progress. Complete that checkout, or wait a moment and refresh — do not pay twice."
      );
    }
    pending.status = "failed";
    await pending.save();
  }

  const reference = `agr_${randomBytes(12).toString("hex")}`;
  const payment = await Payment.create({
    leaseId: lease._id,
    listingId: lease.listingId,
    payerUserId: input.userId,
    payerProfileId: tenantProfile._id,
    payeeProfileId:
      lease.legalProvider === "own_legal" ? lease.landlordProfileId : undefined,
    amount: totalDue,
    grossAmount: totalDue,
    agreementFeeAmount: agreementFee,
    platformFeeAmount: platformFee,
    netPayeeAmount: agreementFee,
    currency: lease.currency || "NGN",
    status: "pending",
    provider: "paystack",
    purpose: "agreement_fee",
    source: "paystack",
    legalProvider: lease.legalProvider,
    legalCompanyName: lease.legalCompanyName,
    providerRef: reference,
  });

  const init = await paystackInitialize({
    email: input.email,
    amountKobo: Math.round(totalDue * 100),
    reference,
    callbackUrl: input.callbackUrl,
    metadata: {
      paymentId: String(payment._id),
      leaseId: String(lease._id),
      purpose: "agreement_fee",
    },
  });

  return {
    payment,
    init,
    agreementFee,
    platformFee,
    totalDue,
  };
}

export async function resolveAgreementFeeEmail(userId: string) {
  const user = await User.findById(userId).select("email name").lean();
  return user?.email || null;
}
