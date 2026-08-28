import mongoose from "mongoose";
import { writeAudit, type AuditActor } from "@/lib/audit";
import {
  computeWithdrawalAmounts,
  getPayoutSettings,
  type PayoutProvider,
} from "@/lib/payout-settings";
import { generateReceiptPdf, type ReceiptDocumentInput } from "@/lib/receipt-pdf";
import { sendAgreementDocumentEmail } from "@/lib/receipt-email";
import { paystackCreateRecipient, paystackInitiateTransfer } from "@/lib/paystack";
import {
  generateReceiptNumber,
  generateWalletTxReference,
  generateWithdrawalReference,
  maskAccountNumber,
  withdrawalMinAmount,
} from "@/lib/wallet-utils";
import { Profile, type ProfileType } from "@/models/Profile";
import { User } from "@/models/User";
import { Wallet } from "@/models/Wallet";
import { WalletTransaction } from "@/models/WalletTransaction";
import { Withdrawal } from "@/models/Withdrawal";
import { getOrCreateWallet } from "@/lib/wallet";

const LANDLORD_TYPES = new Set<ProfileType>(["landlord", "estate_manager"]);
const TENANT_TYPES = new Set<ProfileType>(["tenant", "student"]);

export function serializeWithdrawalPublic(w: InstanceType<typeof Withdrawal>) {
  return {
    id: String(w._id),
    amount: w.amount,
    fee: w.fee,
    netAmount: w.netAmount,
    paidAmount: w.paidAmount ?? null,
    currency: w.currency,
    bankName: w.bankName,
    accountName: w.accountName,
    accountNumberLast4: w.accountNumberLast4,
    payoutProvider: w.payoutProvider,
    status: w.status,
    providerRef: w.providerRef || null,
    sessionId: w.sessionId || null,
    transferReceiptUrl: w.transferReceiptUrl || null,
    hihReceiptNumber: w.hihReceiptNumber || null,
    hihReceiptUrl: w.hihReceiptUrl || null,
    disputeStatus: w.disputeStatus,
    disputeReason: w.disputeReason || null,
    failureReason: w.failureReason || null,
    createdAt: w.createdAt,
    completedAt: w.completedAt || null,
  };
}

export function serializeWithdrawalAdmin(w: InstanceType<typeof Withdrawal>) {
  return {
    ...serializeWithdrawalPublic(w),
    accountNumber: w.accountNumber || null,
    bankCode: w.bankCode || null,
    adminNote: w.adminNote || null,
    profileId: String(w.profileId),
    userId: String(w.userId),
  };
}

async function buildWithdrawalReceiptPdf(
  withdrawal: InstanceType<typeof Withdrawal>,
  payerName: string
) {
  const input: ReceiptDocumentInput = {
    title: "Withdrawal receipt",
    receiptNumber: withdrawal.hihReceiptNumber || String(withdrawal._id),
    issuedAt: withdrawal.completedAt || new Date(),
    payerName: "House In Hand",
    payeeName: payerName,
    reference: withdrawal.providerRef,
    currency: withdrawal.currency,
    lines: [
      { label: "Withdrawal requested", amount: withdrawal.amount, kind: "subtotal" },
      { label: "Withdrawal fee", amount: withdrawal.fee, kind: "deduction" },
      {
        label: "Amount sent to bank",
        amount: withdrawal.paidAmount ?? withdrawal.netAmount,
        kind: "total",
      },
    ],
    totalAmount: withdrawal.paidAmount ?? withdrawal.netAmount,
    purposeLabel: "Wallet withdrawal",
    footerNote: withdrawal.sessionId
      ? `Bank session ID: ${withdrawal.sessionId}`
      : undefined,
  };
  return generateReceiptPdf(input);
}

export async function saveWalletBankDetailsWithPayout(input: {
  profileId: mongoose.Types.ObjectId;
  userId: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  payoutProvider: PayoutProvider;
}) {
  const profile = await Profile.findOne({
    _id: input.profileId,
    userId: input.userId,
  });
  if (
    !profile ||
    (!LANDLORD_TYPES.has(profile.type) && !TENANT_TYPES.has(profile.type))
  ) {
    throw new Error("Profile cannot set payout bank details.");
  }

  const accountNumber = input.accountNumber.replace(/\D/g, "");
  if (accountNumber.length < 10) {
    throw new Error("Enter a valid account number.");
  }

  let paystackRecipientCode: string | undefined;
  if (input.payoutProvider === "paystack") {
    const recipient = await paystackCreateRecipient({
      name: input.accountName.trim(),
      accountNumber,
      bankCode: input.bankCode,
    });
    paystackRecipientCode = recipient.recipient_code;
  }

  const wallet = await getOrCreateWallet(profile._id);
  wallet.bankDetails = {
    bankCode: input.bankCode,
    bankName: input.bankName.trim(),
    accountName: input.accountName.trim(),
    accountNumberLast4: maskAccountNumber(accountNumber),
    accountNumber,
    paystackRecipientCode,
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
  const payoutSettings = await getPayoutSettings();
  const profile = await Profile.findOne({
    _id: input.profileId,
    userId: input.userId,
  });
  if (
    !profile ||
    (!LANDLORD_TYPES.has(profile.type) && !TENANT_TYPES.has(profile.type))
  ) {
    throw new Error("This profile cannot withdraw.");
  }
  if (profile.status !== "verified") {
    throw new Error("Verify your profile before withdrawing funds.");
  }

  const minAmount = withdrawalMinAmount();
  if (input.amount < minAmount) {
    throw new Error(`Minimum withdrawal is NGN ${minAmount.toLocaleString()}.`);
  }

  const wallet = await Wallet.findOne({ profileId: profile._id }).select(
    "+bankDetails.accountNumber"
  );
  if (!wallet?.bankDetails) {
    throw new Error("Add your bank account before withdrawing.");
  }
  if (
    payoutSettings.provider === "paystack" &&
    !wallet.bankDetails.paystackRecipientCode
  ) {
    throw new Error("Bank account is not ready for automated payout.");
  }

  const { fee, netAmount, totalDebit } = computeWithdrawalAmounts(
    input.amount,
    payoutSettings.withdrawalFee
  );
  if (netAmount <= 0) {
    throw new Error("Withdrawal amount must be greater than the fee.");
  }
  if (wallet.availableBalance < totalDebit) {
    throw new Error("Insufficient available balance. Unlock reserved funds first.");
  }

  const providerRef = generateWithdrawalReference();
  const walletAfter = await Wallet.findOneAndUpdate(
    { _id: wallet._id, availableBalance: { $gte: totalDebit } },
    { $inc: { availableBalance: -totalDebit, totalWithdrawn: totalDebit } },
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
    netAmount,
    currency: wallet.currency,
    bankName: wallet.bankDetails.bankName,
    bankCode: wallet.bankDetails.bankCode,
    accountName: wallet.bankDetails.accountName,
    accountNumberLast4: wallet.bankDetails.accountNumberLast4,
    accountNumber: wallet.bankDetails.accountNumber,
    payoutProvider: payoutSettings.provider,
    status: payoutSettings.provider === "manual" ? "pending" : "processing",
    providerRef,
    disputeStatus: "none",
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
    metadata: { fee, netAmount, payoutProvider: payoutSettings.provider },
  });

  withdrawal.walletTransactionId = walletTx._id;
  await withdrawal.save();

  if (payoutSettings.provider === "manual") {
    await writeAudit({
      action: "wallet.withdraw_manual_pending",
      summary: `Manual withdrawal pending · ${wallet.currency} ${input.amount.toLocaleString()}`,
      actor: input.actor,
      entityType: "withdrawal",
      entityId: String(withdrawal._id),
      metadata: { profileId: String(profile._id), providerRef, fee, netAmount },
    });

    return {
      withdrawal,
      wallet: walletAfter,
      walletTransaction: walletTx,
      mode: "manual" as const,
      message:
        "Withdrawal submitted. Our team will process your bank transfer manually. You will receive the transfer receipt and a House In Hand confirmation once completed.",
    };
  }

  try {
    const transfer = await paystackInitiateTransfer({
      amountKobo: Math.round(netAmount * 100),
      recipientCode: wallet.bankDetails.paystackRecipientCode!,
      reference: providerRef,
      reason: LANDLORD_TYPES.has(profile.type)
        ? "House In Hand rent payout"
        : "House In Hand wallet withdrawal",
    });

    withdrawal.transferCode = transfer.transfer_code;
    withdrawal.status =
      transfer.status === "success" ? "completed" : "processing";
    if (withdrawal.status === "completed") {
      withdrawal.completedAt = new Date();
      withdrawal.paidAmount = netAmount;
      withdrawal.hihReceiptNumber = generateReceiptNumber();
      const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
        /\/$/,
        ""
      );
      withdrawal.hihReceiptUrl = `${appUrl}/api/portal/wallet/withdrawals/${withdrawal._id}/receipt`;
    }
    await withdrawal.save();

    walletTx.status = withdrawal.status === "completed" ? "completed" : "pending";
    await walletTx.save();

    await writeAudit({
      action: "wallet.withdraw",
      summary: `Paystack withdrawal of ${wallet.currency} ${input.amount.toLocaleString()}`,
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

    return {
      withdrawal,
      wallet: walletAfter,
      walletTransaction: walletTx,
      mode: "paystack" as const,
      message: "Withdrawal submitted successfully.",
    };
  } catch (err) {
    await Wallet.findByIdAndUpdate(wallet._id, {
      $inc: { availableBalance: totalDebit, totalWithdrawn: -totalDebit },
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

export async function completeManualWithdrawal(input: {
  withdrawalId: mongoose.Types.ObjectId;
  adminUserId: string;
  sessionId: string;
  paidAmount: number;
  transferReceiptUrl: string;
  transferReceiptPublicId?: string;
  adminNote?: string;
}) {
  const withdrawal = await Withdrawal.findById(input.withdrawalId).select(
    "+accountNumber"
  );
  if (!withdrawal) throw new Error("Withdrawal not found.");
  if (withdrawal.payoutProvider !== "manual") {
    throw new Error("This withdrawal is not a manual payout.");
  }
  if (withdrawal.status !== "pending" && withdrawal.status !== "processing") {
    throw new Error("Withdrawal is not awaiting completion.");
  }

  withdrawal.status = "completed";
  withdrawal.completedAt = new Date();
  withdrawal.sessionId = input.sessionId.trim();
  withdrawal.paidAmount = input.paidAmount;
  withdrawal.transferReceiptUrl = input.transferReceiptUrl;
  withdrawal.transferReceiptPublicId = input.transferReceiptPublicId;
  withdrawal.adminNote = input.adminNote?.trim();
  withdrawal.processedBy = new mongoose.Types.ObjectId(input.adminUserId);
  withdrawal.hihReceiptNumber = generateReceiptNumber();
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  withdrawal.hihReceiptUrl = `${appUrl}/api/portal/wallet/withdrawals/${withdrawal._id}/receipt`;
  await withdrawal.save();

  if (withdrawal.walletTransactionId) {
    await WalletTransaction.findByIdAndUpdate(withdrawal.walletTransactionId, {
      status: "completed",
      "metadata.paidAmount": input.paidAmount,
      "metadata.sessionId": input.sessionId,
    });
  }

  const user = await User.findById(withdrawal.userId).select("email name").lean();
  if (user?.email) {
    const pdf = await buildWithdrawalReceiptPdf(
      withdrawal,
      user.name || user.email
    );
    await sendAgreementDocumentEmail({
      to: user.email,
      subject: `Withdrawal completed · ${withdrawal.hihReceiptNumber}`,
      bodyHtml: `
        <h1 style="margin:0 0 8px;font-size:20px;color:#0B1F3A;">Withdrawal completed</h1>
        <p style="margin:0 0 12px;color:#5A6A7D;">Your manual bank transfer has been completed.</p>
        <p style="margin:0 0 8px;"><strong>Amount sent:</strong> ${withdrawal.currency} ${input.paidAmount.toLocaleString()}</p>
        <p style="margin:0 0 8px;"><strong>Session ID:</strong> ${input.sessionId}</p>
        <p style="margin:0 0 8px;"><strong>Fee:</strong> ${withdrawal.currency} ${withdrawal.fee.toLocaleString()}</p>
        <p style="margin:16px 0 0;"><a href="${withdrawal.transferReceiptUrl}" style="color:#008585;">View bank transfer receipt</a></p>
      `,
      pdf,
      filename: `${withdrawal.hihReceiptNumber}.pdf`,
    });
  }

  await writeAudit({
    action: "wallet.withdraw_manual_complete",
    summary: `Completed manual withdrawal ${withdrawal.providerRef}`,
    actor: { kind: "admin", name: "Admin", id: input.adminUserId },
    entityType: "withdrawal",
    entityId: String(withdrawal._id),
    metadata: {
      sessionId: input.sessionId,
      paidAmount: input.paidAmount,
      fee: withdrawal.fee,
    },
  });

  return withdrawal;
}

export async function openWithdrawalDispute(input: {
  withdrawalId: mongoose.Types.ObjectId;
  userId: string;
  reason: string;
}) {
  const withdrawal = await Withdrawal.findById(input.withdrawalId);
  if (!withdrawal || String(withdrawal.userId) !== input.userId) {
    throw new Error("Withdrawal not found.");
  }
  if (withdrawal.status !== "completed") {
    throw new Error("Disputes can only be opened for completed withdrawals.");
  }
  if (withdrawal.disputeStatus === "open") {
    throw new Error("A dispute is already open for this withdrawal.");
  }

  withdrawal.disputeStatus = "open";
  withdrawal.disputeReason = input.reason.trim();
  withdrawal.disputeOpenedAt = new Date();
  await withdrawal.save();
  return withdrawal;
}

export async function resolveWithdrawalDispute(input: {
  withdrawalId: mongoose.Types.ObjectId;
  adminUserId: string;
  adminNote?: string;
}) {
  const withdrawal = await Withdrawal.findById(input.withdrawalId);
  if (!withdrawal) throw new Error("Withdrawal not found.");
  if (withdrawal.disputeStatus !== "open") {
    throw new Error("No open dispute for this withdrawal.");
  }

  withdrawal.disputeStatus = "resolved";
  withdrawal.disputeResolvedAt = new Date();
  if (input.adminNote?.trim()) {
    withdrawal.adminNote = input.adminNote.trim();
  }
  withdrawal.processedBy = new mongoose.Types.ObjectId(input.adminUserId);
  await withdrawal.save();

  await writeAudit({
    action: "wallet.withdraw_dispute_resolved",
    summary: `Resolved withdrawal dispute ${withdrawal.providerRef}`,
    actor: { kind: "admin", name: "Admin", id: input.adminUserId },
    entityType: "withdrawal",
    entityId: String(withdrawal._id),
  });

  return withdrawal;
}
