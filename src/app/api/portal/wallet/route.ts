import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import {
  getOrCreateWallet,
  serializeWallet,
} from "@/lib/wallet";
import { getPayoutSettings } from "@/lib/payout-settings";
import { serializeWithdrawalPublic } from "@/lib/withdrawal-service";
import { withdrawalMinAmount } from "@/lib/wallet-utils";
import { Profile } from "@/models/Profile";
import { RentLock } from "@/models/RentLock";
import { WalletTransaction } from "@/models/WalletTransaction";
import { Withdrawal } from "@/models/Withdrawal";

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId") || "";
  if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
    return NextResponse.json({ error: "profileId is required." }, { status: 400 });
  }

  await connectDB();
  const profile = await Profile.findOne({ _id: profileId, userId: user.id });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const wallet = await getOrCreateWallet(profile._id);
  const [transactions, withdrawals, rentLocks] = await Promise.all([
    WalletTransaction.find({ profileId: profile._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Withdrawal.find({ profileId: profile._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    RentLock.find({ profileId: profile._id, status: "active" })
      .sort({ rentPeriodStart: 1 })
      .lean(),
  ]);

  const payoutSettings = await getPayoutSettings();

  return NextResponse.json({
    wallet: serializeWallet(wallet),
    transactions: transactions.map((tx) => ({
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
    })),
    withdrawals: withdrawals.map((w) =>
      serializeWithdrawalPublic(w as unknown as InstanceType<typeof Withdrawal>)
    ),
    limits: {
      minWithdrawal: withdrawalMinAmount(),
      withdrawalFee: payoutSettings.withdrawalFee,
      payoutProvider: payoutSettings.provider,
    },
    rentLocks: rentLocks.map((lock) => ({
      id: String(lock._id),
      leaseId: String(lock.leaseId),
      amount: lock.amount,
      currency: lock.currency,
      rentPeriodIndex: lock.rentPeriodIndex,
      rentPeriodStart: lock.rentPeriodStart,
      rentPeriodEnd: lock.rentPeriodEnd,
      status: lock.status,
      canApply: new Date() >= lock.rentPeriodStart,
      createdAt: lock.createdAt,
    })),
  });
}
