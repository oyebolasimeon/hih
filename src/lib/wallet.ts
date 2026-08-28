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
import { RentLock } from "@/models/RentLock";
import {
  formatRentPeriodLabel,
  getNextRentPeriodAfterPaid,
  getPayableRentPeriod,
  getRentPeriodBounds,
  isRentPeriodPaid,
} from "@/lib/rent-period";
import {
  computePlatformFee,
  getPlatformFees,
  type LegalProvider,
} from "@/lib/platform-fees";
import { creditPlatformFeeFromRent } from "@/lib/platform-wallet";

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
    lockedBalance: 0,
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

  if (payment.source === "wallet_lock") {
    return settleRentFromWalletLock(payment, actor);
  }

  const [payeeProfile, leaseDoc] = await Promise.all([
    Profile.findById(payment.payeeProfileId),
    payment.leaseId
      ? Lease.findById(payment.leaseId)
          .select("tenantProfileId legalProvider")
          .lean()
      : null,
  ]);

  if (!payeeProfile || !LANDLORD_TYPES.has(payeeProfile.type)) {
    return payment;
  }

  const fees = await getPlatformFees();
  const legalProvider = (leaseDoc?.legalProvider ||
    payment.legalProvider ||
    "hih") as LegalProvider;
  const grossAmount = payment.grossAmount ?? payment.amount;
  const platformFee =
    payment.platformFeeAmount ??
    computePlatformFee(grossAmount, fees, legalProvider);
  const landlordNet = payment.netPayeeAmount ?? grossAmount - platformFee;

  payment.grossAmount = grossAmount;
  payment.platformFeeAmount = platformFee;
  payment.netPayeeAmount = landlordNet;
  payment.legalProvider = legalProvider;

  const landlordWallet = await getOrCreateWallet(payeeProfile._id);
  const landlordWalletBefore = landlordWallet.availableBalance;

  const landlordWalletAfter = await Wallet.findOneAndUpdate(
    { _id: landlordWallet._id },
    {
      $inc: {
        availableBalance: landlordNet,
        totalCredited: landlordNet,
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
    amount: landlordNet,
    currency: payment.currency,
    balanceAfter: landlordWalletAfter.availableBalance,
    status: "completed",
    reference: generateWalletTxReference("wtx"),
    description:
      platformFee > 0
        ? `Rent received (net) · ${payment.currency} ${landlordNet.toLocaleString()}`
        : `Rent received · ${payment.currency} ${landlordNet.toLocaleString()}`,
    paymentId: payment._id,
    counterpartyProfileId: leaseDoc?.tenantProfileId,
    metadata: {
      providerRef: payment.providerRef,
      leaseId: payment.leaseId ? String(payment.leaseId) : undefined,
      grossAmount,
      platformFee,
    },
  });

  payment.landlordWalletTxId = landlordTx._id;

  if (platformFee > 0) {
    await creditPlatformFeeFromRent(payment, platformFee);
  }

  let tenantTxId: mongoose.Types.ObjectId | undefined;
  if (leaseDoc?.tenantProfileId) {
    const tenantProfile = await Profile.findById(leaseDoc.tenantProfileId);
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

async function settleRentFromWalletLock(
  payment: InstanceType<typeof Payment>,
  actor?: AuditActor
) {
  const lease = payment.leaseId
    ? await Lease.findById(payment.leaseId).lean()
    : null;
  if (!lease) return payment;

  const payeeProfile = await Profile.findById(payment.payeeProfileId);
  const tenantProfile = await Profile.findById(lease.tenantProfileId);
  if (!payeeProfile || !tenantProfile) return payment;

  const landlordWallet = await getOrCreateWallet(payeeProfile._id);
  const tenantWallet = await getOrCreateWallet(tenantProfile._id);
  const landlordBefore = landlordWallet.availableBalance;

  const landlordAfter = await Wallet.findOneAndUpdate(
    { _id: landlordWallet._id },
    {
      $inc: {
        availableBalance: payment.amount,
        totalCredited: payment.amount,
      },
    },
    { new: true }
  );
  if (!landlordAfter) throw new Error("Could not credit landlord wallet.");

  const landlordTx = await WalletTransaction.create({
    walletId: landlordWallet._id,
    profileId: payeeProfile._id,
    userId: payeeProfile.userId,
    type: "rent_credit",
    direction: "in",
    amount: payment.amount,
    currency: payment.currency,
    balanceAfter: landlordAfter.availableBalance,
    status: "completed",
    reference: generateWalletTxReference("wtx"),
    description: `Rent received (reserved funds) · ${payment.currency} ${payment.amount.toLocaleString()}`,
    paymentId: payment._id,
    counterpartyProfileId: tenantProfile._id,
    metadata: {
      leaseId: String(lease._id),
      source: "wallet_lock",
    },
  });

  const tenantAfter = await Wallet.findById(tenantWallet._id);
  const tenantTx = await WalletTransaction.create({
    walletId: tenantWallet._id,
    profileId: tenantProfile._id,
    userId: tenantProfile.userId,
    type: "rent_lock_apply",
    direction: "out",
    amount: payment.amount,
    currency: payment.currency,
    balanceAfter: tenantAfter?.availableBalance || 0,
    status: "completed",
    reference: generateWalletTxReference("wtx"),
    description: `Rent paid from reserved funds · ${payment.currency} ${payment.amount.toLocaleString()}`,
    paymentId: payment._id,
    counterpartyProfileId: payeeProfile._id,
    metadata: {
      leaseId: String(lease._id),
      lockedBalanceAfter: tenantAfter?.lockedBalance || 0,
    },
  });

  payment.landlordWalletTxId = landlordTx._id;
  payment.tenantWalletTxId = tenantTx._id;
  if (!payment.receiptNumber) {
    payment.receiptNumber = generateReceiptNumber();
  }
  await payment.save();

  await writeAudit({
    action: "wallet.rent_lock_apply",
    summary: `Applied reserved rent of ${payment.currency} ${payment.amount.toLocaleString()}`,
    actor: actor || { kind: "system", name: "Payments" },
    entityType: "payment",
    entityId: String(payment._id),
    metadata: {
      leaseId: String(lease._id),
      balanceBefore: landlordBefore,
      balanceAfter: landlordAfter.availableBalance,
    },
  });

  return payment;
}

export async function creditWalletDeposit(
  payment: InstanceType<typeof Payment>
) {
  if (!payment.payerProfileId || payment.tenantWalletTxId) {
    return payment;
  }

  const profile = await Profile.findById(payment.payerProfileId);
  if (!profile || !TENANT_TYPES.has(profile.type)) {
    return payment;
  }

  const wallet = await getOrCreateWallet(profile._id);
  const walletAfter = await Wallet.findOneAndUpdate(
    { _id: wallet._id },
    {
      $inc: {
        availableBalance: payment.amount,
        totalCredited: payment.amount,
      },
    },
    { new: true }
  );
  if (!walletAfter) throw new Error("Could not credit wallet.");

  const tx = await WalletTransaction.create({
    walletId: wallet._id,
    profileId: profile._id,
    userId: profile.userId,
    type: "wallet_deposit",
    direction: "in",
    amount: payment.amount,
    currency: payment.currency,
    balanceAfter: walletAfter.availableBalance,
    status: "completed",
    reference: generateWalletTxReference("wtx"),
    description: `Wallet deposit · ${payment.currency} ${payment.amount.toLocaleString()}`,
    paymentId: payment._id,
    metadata: { providerRef: payment.providerRef },
  });

  payment.tenantWalletTxId = tx._id;
  await payment.save();
  return payment;
}

export async function lockFundsForRent(input: {
  profileId: mongoose.Types.ObjectId;
  userId: string;
  leaseId: mongoose.Types.ObjectId;
  amount?: number;
}) {
  const profile = await Profile.findOne({
    _id: input.profileId,
    userId: input.userId,
  });
  if (!profile || !TENANT_TYPES.has(profile.type)) {
    throw new Error("Only tenant profiles can lock rent funds.");
  }

  const lease = await Lease.findById(input.leaseId);
  if (!lease || String(lease.tenantProfileId) !== String(profile._id)) {
    throw new Error("Lease not found.");
  }
  if (lease.status !== "active") {
    throw new Error("Lease must be active.");
  }

  const payable = await getPayableRentPeriod(lease);
  if (!payable.paid) {
    throw new Error("Pay the current rent period before reserving funds for the next one.");
  }

  const nextPeriod = await getNextRentPeriodAfterPaid(lease);
  const nextPaid = await isRentPeriodPaid(lease._id, nextPeriod.periodIndex);
  if (nextPaid) {
    throw new Error("The next rent period is already paid or reserved.");
  }

  const existingLock = await RentLock.findOne({
    leaseId: lease._id,
    rentPeriodIndex: nextPeriod.periodIndex,
    status: "active",
  });
  if (existingLock) {
    throw new Error("You already have funds locked for the next rent period.");
  }

  const amount = input.amount ?? lease.rentAmount;
  if (amount <= 0) {
    throw new Error("Enter a valid amount.");
  }

  const wallet = await getOrCreateWallet(profile._id);
  if (wallet.availableBalance < amount) {
    throw new Error("Insufficient wallet balance. Deposit funds first.");
  }

  const walletAfter = await Wallet.findOneAndUpdate(
    {
      _id: wallet._id,
      availableBalance: { $gte: amount },
    },
    {
      $inc: {
        availableBalance: -amount,
        lockedBalance: amount,
      },
    },
    { new: true }
  );
  if (!walletAfter) {
    throw new Error("Insufficient wallet balance.");
  }

  const lockTx = await WalletTransaction.create({
    walletId: wallet._id,
    profileId: profile._id,
    userId: profile.userId,
    type: "rent_lock",
    direction: "out",
    amount,
    currency: wallet.currency,
    balanceAfter: walletAfter.availableBalance,
    status: "completed",
    reference: generateWalletTxReference("wtx"),
    description: `Reserved for rent · ${formatRentPeriodLabel(nextPeriod.periodStart, nextPeriod.periodEnd)}`,
    metadata: {
      leaseId: String(lease._id),
      rentPeriodIndex: nextPeriod.periodIndex,
      lockedBalanceAfter: walletAfter.lockedBalance,
    },
  });

  const lock = await RentLock.create({
    walletId: wallet._id,
    profileId: profile._id,
    userId: profile.userId,
    leaseId: lease._id,
    amount,
    currency: wallet.currency,
    rentPeriodIndex: nextPeriod.periodIndex,
    rentPeriodStart: nextPeriod.periodStart,
    rentPeriodEnd: nextPeriod.periodEnd,
    status: "active",
    lockWalletTxId: lockTx._id,
  });

  return { lock, wallet: walletAfter, walletTransaction: lockTx };
}

export async function unlockRentFunds(input: {
  profileId: mongoose.Types.ObjectId;
  userId: string;
  lockId: mongoose.Types.ObjectId;
}) {
  const lock = await RentLock.findById(input.lockId);
  if (!lock || String(lock.profileId) !== String(input.profileId)) {
    throw new Error("Lock not found.");
  }
  if (String(lock.userId) !== input.userId) {
    throw new Error("Forbidden.");
  }
  if (lock.status !== "active") {
    throw new Error("These funds are no longer locked.");
  }

  const walletAfter = await Wallet.findOneAndUpdate(
    {
      _id: lock.walletId,
      lockedBalance: { $gte: lock.amount },
    },
    {
      $inc: {
        lockedBalance: -lock.amount,
        availableBalance: lock.amount,
      },
    },
    { new: true }
  );
  if (!walletAfter) {
    throw new Error("Could not release locked funds.");
  }

  const unlockTx = await WalletTransaction.create({
    walletId: lock.walletId,
    profileId: lock.profileId,
    userId: lock.userId,
    type: "rent_unlock",
    direction: "in",
    amount: lock.amount,
    currency: lock.currency,
    balanceAfter: walletAfter.availableBalance,
    status: "completed",
    reference: generateWalletTxReference("wtx"),
    description: `Released reserved rent · ${formatRentPeriodLabel(lock.rentPeriodStart, lock.rentPeriodEnd)}`,
    metadata: {
      leaseId: String(lock.leaseId),
      rentPeriodIndex: lock.rentPeriodIndex,
      lockedBalanceAfter: walletAfter.lockedBalance,
    },
  });

  lock.status = "released";
  lock.releaseWalletTxId = unlockTx._id;
  await lock.save();

  return { lock, wallet: walletAfter, walletTransaction: unlockTx };
}

export async function applyRentLock(input: {
  profileId: mongoose.Types.ObjectId;
  userId: string;
  lockId: mongoose.Types.ObjectId;
  actor?: AuditActor;
}) {
  const lock = await RentLock.findById(input.lockId);
  if (!lock || String(lock.profileId) !== String(input.profileId)) {
    throw new Error("Lock not found.");
  }
  if (String(lock.userId) !== input.userId) {
    throw new Error("Forbidden.");
  }
  if (lock.status !== "active") {
    throw new Error("These reserved funds are not available.");
  }

  const now = new Date();
  if (now < lock.rentPeriodStart) {
    throw new Error("This rent period has not started yet.");
  }

  const alreadyPaid = await isRentPeriodPaid(lock.leaseId, lock.rentPeriodIndex);
  if (alreadyPaid) {
    throw new Error("Rent for this period is already paid.");
  }

  const lease = await Lease.findById(lock.leaseId);
  if (!lease) throw new Error("Lease not found.");

  const walletAfter = await Wallet.findOneAndUpdate(
    {
      _id: lock.walletId,
      lockedBalance: { $gte: lock.amount },
    },
    { $inc: { lockedBalance: -lock.amount } },
    { new: true }
  );
  if (!walletAfter) {
    throw new Error("Could not apply reserved funds.");
  }

  const reference = `lock_${String(lock._id)}`;
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");

  const payment = await Payment.create({
    leaseId: lease._id,
    listingId: lease.listingId,
    payerUserId: lock.userId,
    payerProfileId: lock.profileId,
    payeeProfileId: lease.landlordProfileId,
    amount: lock.amount,
    currency: lock.currency,
    status: "successful",
    provider: "manual",
    purpose: "rent",
    source: "wallet_lock",
    providerRef: reference,
    rentPeriodIndex: lock.rentPeriodIndex,
    rentPeriodStart: lock.rentPeriodStart,
    rentPeriodEnd: lock.rentPeriodEnd,
    dueDate: lock.rentPeriodEnd,
    paidAt: now,
    receiptNumber: generateReceiptNumber(),
    receiptUrl: `${appUrl}/portal/payments`,
  });

  await settleRentFromWalletLock(payment, input.actor);

  lock.status = "applied";
  lock.paymentId = payment._id;
  await lock.save();

  payment.receiptUrl = `${appUrl}/portal/payments?receipt=${payment._id}`;
  await payment.save();

  return { lock, payment, wallet: walletAfter };
}

export async function getRentStatus(leaseId: mongoose.Types.ObjectId) {
  const lease = await Lease.findById(leaseId).lean();
  if (!lease) return null;

  const payable = await getPayableRentPeriod(lease);
  const pendingPayment = await Payment.findOne({
    leaseId: lease._id,
    purpose: "rent",
    status: "pending",
    rentPeriodIndex: payable.periodIndex,
  })
    .select("_id")
    .lean();

  let nextPeriod = null;
  let nextLock = null;
  if (payable.paid) {
    const next = getRentPeriodBounds(lease, payable.periodIndex + 1);
    nextPeriod = {
      periodIndex: next.periodIndex,
      periodStart: next.periodStart,
      periodEnd: next.periodEnd,
      label: formatRentPeriodLabel(next.periodStart, next.periodEnd),
    };
    nextLock = await RentLock.findOne({
      leaseId: lease._id,
      rentPeriodIndex: next.periodIndex,
      status: "active",
    }).lean();
  }

  const activeLocks = await RentLock.find({
    leaseId: lease._id,
    status: "active",
  })
    .sort({ rentPeriodStart: 1 })
    .lean();

  return {
    leaseId: String(lease._id),
    payablePeriod: {
      periodIndex: payable.periodIndex,
      periodStart: payable.periodStart,
      periodEnd: payable.periodEnd,
      label: formatRentPeriodLabel(payable.periodStart, payable.periodEnd),
      paid: payable.paid,
      expired: payable.expired,
    },
    canPayRent: !payable.paid && !pendingPayment,
    pendingPaymentId: pendingPayment ? String(pendingPayment._id) : null,
    nextPeriod,
    canLockNext: payable.paid && !nextLock,
    nextLock: nextLock
      ? {
          id: String(nextLock._id),
          amount: nextLock.amount,
          currency: nextLock.currency,
          periodIndex: nextLock.rentPeriodIndex,
          periodStart: nextLock.rentPeriodStart,
          periodEnd: nextLock.rentPeriodEnd,
          label: formatRentPeriodLabel(
            nextLock.rentPeriodStart,
            nextLock.rentPeriodEnd
          ),
          canApply: new Date() >= nextLock.rentPeriodStart,
        }
      : null,
    activeLocks: activeLocks.map((lock) => ({
      id: String(lock._id),
      amount: lock.amount,
      currency: lock.currency,
      periodIndex: lock.rentPeriodIndex,
      periodStart: lock.rentPeriodStart,
      periodEnd: lock.rentPeriodEnd,
      label: formatRentPeriodLabel(lock.rentPeriodStart, lock.rentPeriodEnd),
      canApply: new Date() >= lock.rentPeriodStart,
    })),
  };
}

export function serializeRentLock(lock: InstanceType<typeof RentLock>) {
  return {
    id: String(lock._id),
    leaseId: String(lock.leaseId),
    amount: lock.amount,
    currency: lock.currency,
    rentPeriodIndex: lock.rentPeriodIndex,
    rentPeriodStart: lock.rentPeriodStart,
    rentPeriodEnd: lock.rentPeriodEnd,
    status: lock.status,
    createdAt: lock.createdAt,
  };
}

export async function saveWalletBankDetails(input: {
  profileId: mongoose.Types.ObjectId;
  userId: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}) {
  const { getPayoutSettings } = await import("@/lib/payout-settings");
  const { saveWalletBankDetailsWithPayout } = await import(
    "@/lib/withdrawal-service"
  );
  const payoutSettings = await getPayoutSettings();
  return saveWalletBankDetailsWithPayout({
    ...input,
    payoutProvider: payoutSettings.provider,
  });
}

export async function requestWithdrawal(input: {
  profileId: mongoose.Types.ObjectId;
  userId: string;
  amount: number;
  actor: AuditActor;
}) {
  const { requestWithdrawal: requestWithdrawalImpl } = await import(
    "@/lib/withdrawal-service"
  );
  return requestWithdrawalImpl(input);
}

export { serializeWithdrawalPublic as serializeWithdrawal } from "@/lib/withdrawal-service";

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
  lockedBalance: number;
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
    lockedBalance: wallet.lockedBalance,
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
