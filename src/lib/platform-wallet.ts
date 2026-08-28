import mongoose from "mongoose";
import { Admin } from "@/models/Admin";
import { SiteSettings } from "@/models/SiteSettings";
import { Profile } from "@/models/Profile";
import { Wallet } from "@/models/Wallet";
import { WalletTransaction } from "@/models/WalletTransaction";
import { Payment } from "@/models/Payment";
import { Lease } from "@/models/Lease";
import { generateWalletTxReference } from "@/lib/wallet-utils";
import type { AuditActor } from "@/lib/audit";

export async function getPlatformProfileId() {
  const settings = await SiteSettings.findOne({ key: "global" }).lean();
  if (settings && "platformWalletProfileId" in settings) {
    const id = (settings as { platformWalletProfileId?: mongoose.Types.ObjectId })
      .platformWalletProfileId;
    if (id) return id;
  }

  const admin = await Admin.findOne({ active: true }).sort({ createdAt: 1 }).lean();
  if (!admin) {
    throw new Error("Platform wallet is not configured.");
  }

  let profile = await Profile.findOne({
    userId: admin.userId,
    type: { $in: ["landlord", "estate_manager"] },
  });
  if (!profile) {
    profile = await Profile.create({
      userId: admin.userId,
      type: "estate_manager",
      displayName: "House In Hand Platform",
      status: "verified",
    });
  }

  await SiteSettings.findOneAndUpdate(
    { key: "global" },
    { platformWalletProfileId: profile._id },
    { upsert: true }
  );
  return profile._id;
}

export async function getOrCreatePlatformWallet() {
  const existing = await Wallet.findOne({ ownerType: "platform" });
  if (existing) return existing;

  const profileId = await getPlatformProfileId();
  const profile = await Profile.findById(profileId);
  if (!profile) throw new Error("Platform profile not found.");

  return Wallet.create({
    userId: profile.userId,
    profileId: profile._id,
    ownerType: "platform",
    currency: "NGN",
    availableBalance: 0,
    lockedBalance: 0,
    pendingBalance: 0,
    totalCredited: 0,
    totalWithdrawn: 0,
  });
}

async function creditWallet(input: {
  walletId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  type: "agreement_fee" | "platform_fee" | "rent_credit";
  description: string;
  paymentId: mongoose.Types.ObjectId;
  counterpartyProfileId?: mongoose.Types.ObjectId;
}) {
  const walletAfter = await Wallet.findOneAndUpdate(
    { _id: input.walletId },
    {
      $inc: {
        availableBalance: input.amount,
        totalCredited: input.amount,
      },
    },
    { new: true }
  );
  if (!walletAfter) throw new Error("Could not credit wallet.");

  const tx = await WalletTransaction.create({
    walletId: input.walletId,
    profileId: input.profileId,
    userId: input.userId,
    type: input.type,
    direction: "in",
    amount: input.amount,
    currency: input.currency,
    balanceAfter: walletAfter.availableBalance,
    status: "completed",
    reference: generateWalletTxReference("wtx"),
    description: input.description,
    paymentId: input.paymentId,
    counterpartyProfileId: input.counterpartyProfileId,
  });

  return { wallet: walletAfter, transactionId: tx._id };
}

export async function settleAgreementFeePayment(
  payment: InstanceType<typeof Payment>,
  actor?: AuditActor
) {
  if (payment.purpose !== "agreement_fee") {
    return payment;
  }
  if (payment.platformProfileId || payment.landlordWalletTxId) {
    return payment;
  }

  const lease = payment.leaseId
    ? await Lease.findById(payment.leaseId)
    : null;
  if (!lease) return payment;

  const agreementAmount =
    payment.agreementFeeAmount ?? payment.netPayeeAmount ?? payment.amount;
  const platformFee = payment.platformFeeAmount ?? 0;

  if (lease.legalProvider === "hih") {
    const platformWallet = await getOrCreatePlatformWallet();
    const platformProfile = await Profile.findById(platformWallet.profileId);
    if (!platformProfile) throw new Error("Platform profile missing.");
    const credited = await creditWallet({
      walletId: platformWallet._id,
      profileId: platformProfile._id,
      userId: platformProfile.userId,
      amount: agreementAmount,
      currency: payment.currency,
      type: "agreement_fee",
      description: `Agreement & legal fee · ${payment.currency} ${agreementAmount.toLocaleString()}`,
      paymentId: payment._id,
      counterpartyProfileId: payment.payerProfileId,
    });
    payment.platformProfileId = platformProfile._id;
    payment.landlordWalletTxId = credited.transactionId;
  } else if (payment.payeeProfileId) {
    const landlordWallet = await Wallet.findOne({
      profileId: payment.payeeProfileId,
    });
    const profile = await Profile.findById(payment.payeeProfileId);
    if (!landlordWallet || !profile) throw new Error("Landlord wallet missing.");
    const credited = await creditWallet({
      walletId: landlordWallet._id,
      profileId: profile._id,
      userId: profile.userId,
      amount: agreementAmount,
      currency: payment.currency,
      type: "agreement_fee",
      description: `Agreement fee · ${payment.currency} ${agreementAmount.toLocaleString()}`,
      paymentId: payment._id,
      counterpartyProfileId: payment.payerProfileId,
    });
    payment.landlordWalletTxId = credited.transactionId;
  }

  if (platformFee > 0) {
    const platformWallet = await getOrCreatePlatformWallet();
    const platformProfile = await Profile.findById(platformWallet.profileId);
    if (!platformProfile) throw new Error("Platform profile missing.");
    await creditWallet({
      walletId: platformWallet._id,
      profileId: platformProfile._id,
      userId: platformProfile.userId,
      amount: platformFee,
      currency: payment.currency,
      type: "platform_fee",
      description: `Platform fee · ${payment.currency} ${platformFee.toLocaleString()}`,
      paymentId: payment._id,
      counterpartyProfileId: payment.payerProfileId,
    });
    payment.platformProfileId = platformProfile._id;
  }

  lease.agreementFeePaidAt = payment.paidAt || new Date();
  lease.agreementFeePaymentId = payment._id;
  await lease.save();
  await payment.save();

  void actor;
  return payment;
}

export async function creditPlatformFeeFromRent(
  payment: InstanceType<typeof Payment>,
  platformFee: number
) {
  if (platformFee <= 0) return;
  const platformWallet = await getOrCreatePlatformWallet();
  const platformProfile = await Profile.findById(platformWallet.profileId);
  if (!platformProfile) return;
  await creditWallet({
    walletId: platformWallet._id,
    profileId: platformProfile._id,
    userId: platformProfile.userId,
    amount: platformFee,
    currency: payment.currency,
    type: "platform_fee",
    description: `Platform fee on rent · ${payment.currency} ${platformFee.toLocaleString()}`,
    paymentId: payment._id,
    counterpartyProfileId: payment.payerProfileId,
  });
  payment.platformProfileId = platformProfile._id;
  await payment.save();
}
