import mongoose, { Schema, models, model } from "mongoose";

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface IWithdrawal {
  _id: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  bankName: string;
  accountName: string;
  accountNumberLast4: string;
  status: WithdrawalStatus;
  providerRef?: string;
  transferCode?: string;
  failureReason?: string;
  walletTransactionId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
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
    amount: { type: Number, required: true, min: 0 },
    fee: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN", trim: true },
    bankName: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountNumberLast4: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    providerRef: { type: String, trim: true, index: true },
    transferCode: { type: String, trim: true },
    failureReason: { type: String, trim: true },
    walletTransactionId: {
      type: Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const Withdrawal =
  models.Withdrawal || model<IWithdrawal>("Withdrawal", WithdrawalSchema);
