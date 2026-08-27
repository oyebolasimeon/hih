import mongoose, { Schema, models, model } from "mongoose";

export type WalletTxType =
  | "rent_credit"
  | "rent_payment"
  | "wallet_deposit"
  | "rent_lock"
  | "rent_unlock"
  | "rent_lock_apply"
  | "withdrawal"
  | "withdrawal_refund"
  | "adjustment";

export type WalletTxDirection = "in" | "out";
export type WalletTxStatus = "pending" | "completed" | "failed";

export interface IWalletTransaction {
  _id: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: WalletTxType;
  direction: WalletTxDirection;
  amount: number;
  currency: string;
  balanceAfter: number;
  status: WalletTxStatus;
  reference: string;
  description: string;
  paymentId?: mongoose.Types.ObjectId;
  withdrawalId?: mongoose.Types.ObjectId;
  counterpartyProfileId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "rent_credit",
        "rent_payment",
        "wallet_deposit",
        "rent_lock",
        "rent_unlock",
        "rent_lock_apply",
        "withdrawal",
        "withdrawal_refund",
        "adjustment",
      ],
      required: true,
    },
    direction: {
      type: String,
      enum: ["in", "out"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN", trim: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "completed",
    },
    reference: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true, trim: true },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment", index: true },
    withdrawalId: {
      type: Schema.Types.ObjectId,
      ref: "Withdrawal",
      index: true,
    },
    counterpartyProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ profileId: 1, createdAt: -1 });

export const WalletTransaction =
  models.WalletTransaction ||
  model<IWalletTransaction>("WalletTransaction", WalletTransactionSchema);
