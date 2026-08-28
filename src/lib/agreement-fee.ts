import mongoose from "mongoose";
import { randomBytes } from "crypto";
import {
  computeAgreementFee,
  computePlatformFee,
  getPlatformFees,
} from "@/lib/platform-fees";
import { paystackInitialize } from "@/lib/paystack";
import { Lease } from "@/models/Lease";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

export async function computeLeaseAgreementCharge(lease: InstanceType<typeof Lease>) {
  const fees = await getPlatformFees();
  const agreementFee = computeAgreementFee(
    lease.rentAmount,
    fees.agreementFeePercent,
    lease.agreementFeePercent
  );
  const platformFee =
    lease.legalProvider === "own_legal"
      ? 0
      : 0;
  const totalDue = agreementFee + platformFee;
  return {
    fees,
    agreementFee,
    platformFee,
    totalDue,
  };
}

export async function initializeAgreementFeePayment(input: {
  leaseId: mongoose.Types.ObjectId;
  userId: string;
  email: string;
  callbackUrl: string;
}) {
  const lease = await Lease.findById(input.leaseId);
  if (!lease) throw new Error("Agreement not found.");
  if (lease.agreementFeePaidAt) {
    throw new Error("Agreement fee has already been paid.");
  }

  const tenantProfile = await Profile.findOne({
    _id: lease.tenantProfileId,
    userId: input.userId,
  });
  if (!tenantProfile) {
    throw new Error("Only the tenant can pay the agreement fee.");
  }

  const pending = await Payment.findOne({
    leaseId: lease._id,
    purpose: "agreement_fee",
    status: "pending",
  });
  if (pending) {
    throw new Error("An agreement fee payment is already in progress.");
  }

  const { agreementFee, platformFee, totalDue } =
    await computeLeaseAgreementCharge(lease);

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

  return { payment, init, agreementFee, platformFee, totalDue };
}

export async function resolveAgreementFeeEmail(userId: string) {
  const user = await User.findById(userId).select("email name").lean();
  return user?.email || null;
}
