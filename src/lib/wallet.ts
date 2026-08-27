import mongoose from "mongoose";
import { writeAudit, type AuditActor } from "@/lib/audit";
import {
  generateReceiptNumber,
  generateWalletTxReference,
  generateWithdrawalReference,
  maskAccountNumber,
  withdrawalFee,
  withdrawalMinAmount,
} from "@/lib/wallet-utils";
import {
  paystackCreateRecipient,
  paystackInitiateTransfer,
} from "@/lib/paystack";
import { Payment } from "@/models/Payment";
import { Profile, type ProfileType } from "@/models/Profile";
import { Wallet } from "@/models/Wallet";
import { WalletTransaction } from "@/models/WalletTransaction";
import { Withdrawal } from "@/models/Withdrawal";
import { Listing } from "@/models/Listing";
import { Lease } from "@/models/Lease";

const LANDLORD_TYPES = new Set<ProfileType>(["landlord", "estate_manager"]);
const TENANT_TYPES = new Set<ProfileType>(["tenant", "student"]);

export async function getOrCreateWallet(profileId: mongoose.Types.ObjectId) {
  const existing = await Wallet.findOne({ profileId });
  if (existing) return existing;

  const profile = await Profile.findById(profileId);
  if (!profile) throw new Error("Profile not found.");

  return Wallet.create({
    userId: profile.userId,
    profileId: profile._id,
    ownerType: profile.type,
    currency: "NGN",
    availableBalance: 0,
    pendingBalance: 0,
    totalCredited: 0,
    totalWithdrawn: 0,
  });
}

export async function settleRentPaymentWallets(
  payment: InstanceType<typeof Payment>,
  actor?: AuditActor
) {
  if (!payment.payeeProfileId || payment.landlordWalletTxId) {
    return payment;
  }

  const [payeeProfile, payerProfile] = await Promise.all([
    Profile.findById(payment.payeeProfileId),
    payment.leaseId
      ? Lease.findById(payment.leaseId).select("tenantProfileId").lean()
      : null,
  ]);

  if (!payeeProfile || !LANDLORD_TYPES.has(payeeProfile.type)) {
    return payment;
  }

  const landlordWallet = await getOrCreateWallet(payeeProfile._id);
  const landlordWalletBefore = landlordWallet.availableBalance;

  const landlordWalletAfter = await Wallet.findOneAndUpdate(
    { _id: landlordWallet._id },
    {
      $inc: {
        availableBalance: payment.amount,
        totalCredited: payment.amount,
      },
    },
    { new: true }
  );
  if (!landlordWalletAfter) throw new Error("Could not credit landlord wallet.");

  const landlordTx = await WalletTransaction.create({
    walletId: landlordWallet._id,
    profileId: payeeProfile._id,
    userId: payeeProfile.userId,
    type: "rent_credit",
    direction: "in",
    amount: payment.amount,
    currency: payment.currency,
    balanceAfter: landlordWalletAfter.availableBalance,
    status: "completed",
    reference: generateWalletTxReference("wtx"),
    description: `Rent received · ${payment.currency} ${payment.amount.toLocaleString()}`,
    paymentId: payment._id,
    counterpartyProfileId: payerProfile?.tenantProfileId,
    metadata: {
      providerRef: payment.providerRef,
      leaseId: payment.leaseId ? String(payment.leaseId) : undefined,
    },
  });

  payment.landlordWalletTxId = landlordTx._id;

  let tenantTxId: mongoose.Types.ObjectId | undefined;
  if (payerProfile?.tenantProfileId) {
    const tenantProfile = await Profile.findById(payerProfile.tenantProfileId);
    if (tenantProfile && TENANT_TYPES.has(tenantProfile.type)) {
      const tenantWallet = await getOrCreateWallet(tenantProfile._id);
      const tenantTx = await WalletTransaction.create({
        walletId: tenantWallet._id,
        profileId: tenantProfile._id,
        userId: tenantProfile.userId,
        type: "rent_payment",
        direction: "out",
        amount: payment.amount,
        currency: payment.currency,
        balanceAfter: tenantWallet.availableBalance,
        status: "completed",
        reference: generateWalletTxReference("wtx"),
        description: `Rent payment · ${payment.currency} ${payment.amount.toLocaleString()}`,
        paymentId: payment._id,
        counterpartyProfileId: payeeProfile._id,
        metadata: {
          providerRef: payment.providerRef,
          leaseId: payment.leaseId ? String(payment.leaseId) : undefined,
        },
      });
      tenantTxId = tenantTx._id;
      payment.tenantWalletTxId = tenantTx._id;
    }
  }

  if (!payment.receiptNumber) {
    payment.receiptNumber = generateReceiptNumber();
  }

  await payment.save();

  await writeAudit({
    action: "wallet.rent_credit",
    summary: `Credited ${payment.currency} ${payment.amount.toLocaleString()} to landlord wallet`,
    actor: actor || { kind: "system", name: "Payments" },
    entityType: "wallet_transaction",
    entityId: String(landlordTx._id),
    metadata: {
      paymentId: String(payment._id),
      profileId: String(payeeProfile._id),
      balanceBefore: landlordWalletBefore,
      balanceAfter: landlordWalletAfter.availableBalance,
      tenantWalletTxId: tenantTxId ? String(tenantTxId) : undefined,
    },
  });

  return payment;
}

export async function saveWalletBankDetails(input: {
  profileId: mongoose.Types.ObjectId;
  userId: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}) {
  const profile = await Profile.findOne({
    _id: input.profileId,
    userId: input.userId,
  });
  if (!profile || !LANDLORD_TYPES.has(profile.type)) {
    throw new Error("Only landlord profiles can set payout bank details.");
  }

  const accountNumber = input.accountNumber.replace(/\D/g, "");
  if (accountNumber.length < 10) {
    throw new Error("Enter a valid account number.");
  }

  const recipient = await paystackCreateRecipient({
    name: input.accountName.trim(),
    accountNumber,
    bankCode: input.bankCode,
  });

  const wallet = await getOrCreateWallet(profile._id);
  wallet.bankDetails = {
    bankCode: input.bankCode,
    bankName: input.bankName.trim(),
    accountName: input.accountName.trim(),
    accountNumberLast4: maskAccountNumber(accountNumber),
    paystackRecipientCode: recipient.recipient_code,
  };
  await wallet.save();

  return wallet;
}

export async function requestWithdrawal(input: {
  profileId: mongoose.Types.ObjectId;
  userId: string;
  amount: number;
  actor: AuditActor;
}) {
  const profile = await Profile.findOne({
    _id: input.profileId,
    userId: input.userId,
  });
  if (!profile || !LANDLORD_TYPES.has(profile.type)) {
    throw new Error("Only landlord profiles can withdraw.");
  }
  if (profile.status !== "verified") {
    throw new Error("Verify your profile before withdrawing funds.");
  }

  const minAmount = withdrawalMinAmount();
  if (input.amount < minAmount) {
    throw new Error(`Minimum withdrawal is NGN ${minAmount.toLocaleString()}.`);
  }

  const wallet = await getOrCreateWallet(profile._id);
  if (!wallet.bankDetails?.paystackRecipientCode) {
    throw new Error("Add your bank account before withdrawing.");
  }

  const fee = withdrawalFee();
  const totalDebit = input.amount;
  if (wallet.availableBalance < totalDebit) {
    throw new Error("Insufficient wallet balance.");
  }

  const providerRef = generateWithdrawalReference();
  const walletAfter = await Wallet.findOneAndUpdate(
    {
      _id: wallet._id,
      availableBalance: { $gte: totalDebit },
    },
    {
      $inc: {
        availableBalance: -totalDebit,
        totalWithdrawn: totalDebit,
      },
    },
    { new: true }
  );
  if (!walletAfter) {
    throw new Error("Insufficient wallet balance.");
  }

  const withdrawal = await Withdrawal.create({
    walletId: wallet._id,
    profileId: profile._id,
    userId: profile.userId,
    amount: input.amount,
    fee,
    netAmount: input.amount - fee,
    currency: wallet.currency,
    bankName: wallet.bankDetails.bankName,
    accountName: wallet.bankDetails.accountName,
    accountNumberLast4: wallet.bankDetails.accountNumberLast4,
    status: "processing",
    providerRef,
  });

  const walletTx = await WalletTransaction.create({
    walletId: wallet._id,
    profileId: profile._id,
    userId: profile.userId,
    type: "withdrawal",
    direction: "out",
    amount: totalDebit,
    currency: wallet.currency,
    balanceAfter: walletAfter.availableBalance,
    status: "pending",
    reference: generateWalletTxReference("wtx"),
    description: `Withdrawal to ${wallet.bankDetails.bankName} ${wallet.bankDetails.accountNumberLast4}`,
    withdrawalId: withdrawal._id,
    metadata: { fee, netAmount: input.amount - fee },
  });

  withdrawal.walletTransactionId = walletTx._id;
  await withdrawal.save();

  try {
    const transfer = await paystackInitiateTransfer({
      amountKobo: Math.round((input.amount - fee) * 100),
      recipientCode: wallet.bankDetails.paystackRecipientCode,
      reference: providerRef,
      reason: "House In Hand rent payout",
    });

    withdrawal.transferCode = transfer.transfer_code;
    withdrawal.status =
      transfer.status === "success" || transfer.status === "pending"
        ? "completed"
        : "processing";
    if (withdrawal.status === "completed") {
      withdrawal.completedAt = new Date();
    }
    await withdrawal.save();

    walletTx.status = withdrawal.status === "completed" ? "completed" : "pending";
    await walletTx.save();

    await writeAudit({
      action: "wallet.withdraw",
      summary: `Withdrawal of ${wallet.currency} ${input.amount.toLocaleString()} initiated`,
      actor: input.actor,
      entityType: "withdrawal",
      entityId: String(withdrawal._id),
      metadata: {
        profileId: String(profile._id),
        providerRef,
        transferCode: transfer.transfer_code,
        balanceAfter: walletAfter.availableBalance,
      },
    });

    return { withdrawal, wallet: walletAfter, walletTransaction: walletTx };
  } catch (err) {
    await Wallet.findByIdAndUpdate(wallet._id, {
      $inc: {
        availableBalance: totalDebit,
        totalWithdrawn: -totalDebit,
      },
    });

    withdrawal.status = "failed";
    withdrawal.failureReason =
      err instanceof Error ? err.message : "Withdrawal failed.";
    await withdrawal.save();

    walletTx.status = "failed";
    await walletTx.save();

    await WalletTransaction.create({
      walletId: wallet._id,
      profileId: profile._id,
      userId: profile.userId,
      type: "withdrawal_refund",
      direction: "in",
      amount: totalDebit,
      currency: wallet.currency,
      balanceAfter: walletAfter.availableBalance + totalDebit,
      status: "completed",
      reference: generateWalletTxReference("wtx"),
      description: "Withdrawal refund — transfer failed",
      withdrawalId: withdrawal._id,
    });

    throw err;
  }
}

export async function buildPaymentReceipt(paymentId: string, userId: string) {
  const payment = await Payment.findById(paymentId).lean();
  if (!payment) return null;

  const profiles = await Profile.find({ userId }).select("_id").lean();
  const profileIds = new Set(profiles.map((p) => String(p._id)));
  const isPayer = String(payment.payerUserId) === userId;
  const isPayee =
    payment.payeeProfileId && profileIds.has(String(payment.payeeProfileId));
  if (!isPayer && !isPayee) return null;
  if (payment.status !== "successful") return null;

  const [lease, listing, payeeProfile] = await Promise.all([
    payment.leaseId
      ? Lease.findById(payment.leaseId)
          .select("rentAmount currency paymentPeriod tenantProfileId landlordProfileId")
          .lean()
      : null,
    payment.listingId
      ? Listing.findById(payment.listingId).select("title address").lean()
      : null,
    payment.payeeProfileId
      ? Profile.findById(payment.payeeProfileId).select("displayName type").lean()
      : null,
  ]);

  return {
    receiptNumber: payment.receiptNumber,
    paymentId: String(payment._id),
    amount: payment.amount,
    currency: payment.currency,
    paidAt: payment.paidAt,
    providerRef: payment.providerRef,
    lease: lease
      ? {
          id: String(lease._id),
          rentAmount: lease.rentAmount,
          currency: lease.currency,
          paymentPeriod: lease.paymentPeriod,
        }
      : null,
    listing: listing
      ? {
          title: listing.title,
          address: listing.address,
        }
      : null,
    payee: payeeProfile
      ? { name: payeeProfile.displayName, type: payeeProfile.type }
      : null,
  };
}

export type SerializedWallet = {
  id: string;
  profileId: string;
  ownerType: string;
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  totalCredited: number;
  totalWithdrawn: number;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumberLast4: string;
    bankCode: string;
  } | null;
};

export function serializeWallet(
  wallet: InstanceType<typeof Wallet>
): SerializedWallet {
  return {
    id: String(wallet._id),
    profileId: String(wallet.profileId),
    ownerType: wallet.ownerType,
    currency: wallet.currency,
    availableBalance: wallet.availableBalance,
    pendingBalance: wallet.pendingBalance,
    totalCredited: wallet.totalCredited,
    totalWithdrawn: wallet.totalWithdrawn,
    bankDetails: wallet.bankDetails
      ? {
          bankName: wallet.bankDetails.bankName,
          accountName: wallet.bankDetails.accountName,
          accountNumberLast4: wallet.bankDetails.accountNumberLast4,
          bankCode: wallet.bankDetails.bankCode,
        }
      : null,
  };
}

export function serializeWalletTransaction(
  tx: InstanceType<typeof WalletTransaction>
) {
  return {
    id: String(tx._id),
    type: tx.type,
    direction: tx.direction,
    amount: tx.amount,
    currency: tx.currency,
    balanceAfter: tx.balanceAfter,
    status: tx.status,
    reference: tx.reference,
    description: tx.description,
    paymentId: tx.paymentId ? String(tx.paymentId) : null,
    withdrawalId: tx.withdrawalId ? String(tx.withdrawalId) : null,
    createdAt: tx.createdAt,
  };
}

export function serializeWithdrawal(w: InstanceType<typeof Withdrawal>) {
  return {
    id: String(w._id),
    amount: w.amount,
    fee: w.fee,
    netAmount: w.netAmount,
    currency: w.currency,
    bankName: w.bankName,
    accountName: w.accountName,
    accountNumberLast4: w.accountNumberLast4,
    status: w.status,
    providerRef: w.providerRef || null,
    failureReason: w.failureReason || null,
    createdAt: w.createdAt,
    completedAt: w.completedAt || null,
  };
}
