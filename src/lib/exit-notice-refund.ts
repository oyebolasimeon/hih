import mongoose from "mongoose";
import { Lease } from "@/models/Lease";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";
import { ExitNotice } from "@/models/ExitNotice";
import { getOrCreateWallet } from "@/lib/wallet";
import { Wallet } from "@/models/Wallet";
import { WalletTransaction } from "@/models/WalletTransaction";
import { getRentPeriodAt } from "@/lib/rent-period";
import type { AuditActor } from "@/lib/audit";
import { writeAudit } from "@/lib/audit";

function generateWalletTxReference(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Suggest unused portion of the current paid rent period after vacate date. */
export async function suggestRemainingRentRefund(input: {
  leaseId: mongoose.Types.ObjectId | string;
  proposedVacateDate: Date;
}) {
  const lease = await Lease.findById(input.leaseId);
  if (!lease) {
    return {
      unpaidRentDetected: true,
      suggestedRefund: 0,
      currency: "NGN",
      paymentId: null as string | null,
      note: "Lease not found.",
    };
  }

  const period = getRentPeriodAt(lease, input.proposedVacateDate);
  const payment = await Payment.findOne({
    leaseId: lease._id,
    purpose: "rent",
    status: "successful",
    rentPeriodIndex: period.periodIndex,
  })
    .sort({ createdAt: -1 })
    .lean();

  if (!payment) {
    return {
      unpaidRentDetected: true,
      suggestedRefund: 0,
      currency: lease.currency || "NGN",
      paymentId: null as string | null,
      note: "Current rent period appears unpaid — admin/legal must decide any settlement.",
    };
  }

  const totalMs = Math.max(
    1,
    period.periodEnd.getTime() - period.periodStart.getTime()
  );
  const remainingMs = Math.max(
    0,
    period.periodEnd.getTime() - input.proposedVacateDate.getTime()
  );
  const ratio = remainingMs / totalMs;
  const suggested = Math.round(payment.amount * ratio);

  return {
    unpaidRentDetected: false,
    suggestedRefund: suggested,
    currency: payment.currency || lease.currency || "NGN",
    paymentId: String(payment._id),
    note:
      suggested > 0
        ? `Prorated unused portion of paid period (~${Math.round(ratio * 100)}%). Subject to agreement & legal review.`
        : "No unused paid period remaining after proposed vacate date.",
  };
}

/**
 * Admin/legal processes remaining-rent refund for an exit notice.
 * Partial credit to tenant from landlord wallet against a linked rent payment when possible.
 */
export async function adminProcessExitRentRefund(input: {
  noticeId: mongoose.Types.ObjectId | string;
  amount: number;
  decision: "refund" | "deny";
  notes?: string;
  actor: AuditActor;
  adminUserId: string;
}) {
  const notice = await ExitNotice.findById(input.noticeId);
  if (!notice) throw new Error("Exit notice not found.");
  if (!["served", "acknowledged", "approved", "completed"].includes(notice.status)) {
    throw new Error("Refund can only be decided after the notice is approved/served.");
  }
  if (notice.refundStatus === "refunded") {
    throw new Error("Refund already processed.");
  }

  if (input.decision === "deny") {
    notice.refundStatus = "denied";
    notice.remainingRentRefundAmount = 0;
    notice.refundDecisionNotes = input.notes || "Denied by admin/legal.";
    notice.reviewerUserId = new mongoose.Types.ObjectId(input.adminUserId);
    await notice.save();
    await writeAudit({
      action: "exit_notice.refund_denied",
      summary: `Denied remaining-rent refund on exit notice ${notice.documentNumber || notice._id}`,
      actor: input.actor,
      entityType: "exit_notice",
      entityId: String(notice._id),
      metadata: { notes: input.notes || "" },
    });
    return { notice, refunded: 0 };
  }

  const amount = Math.round(input.amount);
  if (amount <= 0) throw new Error("Refund amount must be positive.");

  const lease = await Lease.findById(notice.leaseId);
  if (!lease) throw new Error("Lease not found.");

  const landlordProfile = await Profile.findById(notice.landlordProfileId);
  const tenantProfile = await Profile.findById(notice.tenantProfileId);
  if (!landlordProfile || !tenantProfile) {
    throw new Error("Profiles not found.");
  }

  let payment =
    notice.remainingRentRefundPaymentId
      ? await Payment.findById(notice.remainingRentRefundPaymentId)
      : null;
  if (!payment) {
    const period = getRentPeriodAt(lease, notice.proposedVacateDate);
    payment = await Payment.findOne({
      leaseId: lease._id,
      purpose: "rent",
      status: "successful",
      rentPeriodIndex: period.periodIndex,
    }).sort({ createdAt: -1 });
  }

  if (payment && amount > payment.amount) {
    throw new Error("Refund cannot exceed the linked rent payment amount.");
  }

  const landlordWallet = await getOrCreateWallet(landlordProfile._id);
  const landlordAfter = await Wallet.findOneAndUpdate(
    { _id: landlordWallet._id, availableBalance: { $gte: amount } },
    {
      $inc: {
        availableBalance: -amount,
        totalCredited: -amount,
      },
    },
    { new: true }
  );
  if (!landlordAfter) {
    throw new Error(
      "Landlord wallet has insufficient balance for this refund. Ask landlord to top up or reduce amount."
    );
  }

  const tenantWallet = await getOrCreateWallet(tenantProfile._id);
  const tenantAfter = await Wallet.findOneAndUpdate(
    { _id: tenantWallet._id },
    {
      $inc: {
        availableBalance: amount,
        totalCredited: amount,
      },
    },
    { new: true }
  );
  if (!tenantAfter) throw new Error("Could not credit tenant wallet.");

  await WalletTransaction.create({
    walletId: landlordWallet._id,
    profileId: landlordProfile._id,
    userId: landlordProfile.userId,
    type: "rent_refund",
    direction: "out",
    amount,
    currency: notice.remainingRentRefundCurrency || lease.currency || "NGN",
    balanceAfter: landlordAfter.availableBalance,
    status: "completed",
    reference: generateWalletTxReference("wtx"),
    description: `Exit remaining-rent refund · ${amount.toLocaleString()}`,
    paymentId: payment?._id,
    counterpartyProfileId: tenantProfile._id,
    metadata: {
      exitNoticeId: String(notice._id),
      adminUserId: input.adminUserId,
      notes: input.notes || "",
    },
  });

  await WalletTransaction.create({
    walletId: tenantWallet._id,
    profileId: tenantProfile._id,
    userId: tenantProfile.userId,
    type: "rent_refund",
    direction: "in",
    amount,
    currency: notice.remainingRentRefundCurrency || lease.currency || "NGN",
    balanceAfter: tenantAfter.availableBalance,
    status: "completed",
    reference: generateWalletTxReference("wtx"),
    description: `Exit remaining-rent credit · ${amount.toLocaleString()}`,
    paymentId: payment?._id,
    counterpartyProfileId: landlordProfile._id,
    metadata: {
      exitNoticeId: String(notice._id),
      adminUserId: input.adminUserId,
      notes: input.notes || "",
    },
  });

  notice.refundStatus = "refunded";
  notice.remainingRentRefundAmount = amount;
  notice.remainingRentRefundPaymentId = payment?._id;
  notice.refundDecisionNotes = input.notes || "Approved by admin/legal.";
  notice.reviewerUserId = new mongoose.Types.ObjectId(input.adminUserId);
  await notice.save();

  await writeAudit({
    action: "exit_notice.refund",
    summary: `Refunded ${amount} remaining rent on exit notice ${notice.documentNumber || notice._id}`,
    actor: input.actor,
    entityType: "exit_notice",
    entityId: String(notice._id),
    metadata: {
      amount,
      paymentId: payment ? String(payment._id) : null,
      notes: input.notes || "",
    },
  });

  return { notice, refunded: amount };
}
