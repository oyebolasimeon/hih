import mongoose, { Schema, models, model } from "mongoose";

export type WithdrawalStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type WithdrawalPayoutProvider = "paystack" | "manual";

export type WithdrawalDisputeStatus = "none" | "open" | "resolved";

export interface IWithdrawal {
  _id: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  fee: number;
  netAmount: number;
  paidAmount?: number;
  currency: string;
  bankName: string;
  bankCode?: string;
  accountName: string;
  accountNumberLast4: string;
  accountNumber?: string;
  payoutProvider: WithdrawalPayoutProvider;
  status: WithdrawalStatus;
  providerRef?: string;
  transferCode?: string;
  sessionId?: string;
  transferReceiptUrl?: string;
  transferReceiptPublicId?: string;
  hihReceiptNumber?: string;
  hihReceiptUrl?: string;
  failureReason?: string;
  disputeStatus: WithdrawalDisputeStatus;
  disputeReason?: string;
  disputeOpenedAt?: Date;
  disputeResolvedAt?: Date;
  adminNote?: string;
  processedBy?: mongoose.Types.ObjectId;
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
    paidAmount: { type: Number, min: 0 },
    currency: { type: String, default: "NGN", trim: true },
    bankName: { type: String, required: true, trim: true },
    bankCode: { type: String, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountNumberLast4: { type: String, required: true, trim: true },
    accountNumber: { type: String, trim: true, select: false },
    payoutProvider: {
      type: String,
      enum: ["paystack", "manual"],
      default: "paystack",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
      index: true,
    },
    providerRef: { type: String, trim: true, index: true },
    transferCode: { type: String, trim: true },
    sessionId: { type: String, trim: true },
    transferReceiptUrl: { type: String, trim: true },
    transferReceiptPublicId: { type: String, trim: true },
    hihReceiptNumber: { type: String, trim: true },
    hihReceiptUrl: { type: String, trim: true },
    failureReason: { type: String, trim: true },
    disputeStatus: {
      type: String,
      enum: ["none", "open", "resolved"],
      default: "none",
      index: true,
    },
    disputeReason: { type: String, trim: true },
    disputeOpenedAt: { type: Date },
    disputeResolvedAt: { type: Date },
    adminNote: { type: String, trim: true },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
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
