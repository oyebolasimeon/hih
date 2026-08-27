import mongoose, { Schema, models, model } from "mongoose";

export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";
export type PaymentProvider = "paystack" | "flutterwave" | "manual";
export type PaymentPurpose = "rent" | "wallet_deposit";
export type PaymentSource = "paystack" | "wallet_lock";

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  leaseId?: mongoose.Types.ObjectId;
  listingId?: mongoose.Types.ObjectId;
  payerUserId: mongoose.Types.ObjectId;
  payeeProfileId?: mongoose.Types.ObjectId;
  payerProfileId?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  purpose: PaymentPurpose;
  source: PaymentSource;
  providerRef?: string;
  receiptUrl?: string;
  receiptNumber?: string;
  landlordWalletTxId?: mongoose.Types.ObjectId;
  tenantWalletTxId?: mongoose.Types.ObjectId;
  rentPeriodIndex?: number;
  rentPeriodStart?: Date;
  rentPeriodEnd?: Date;
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    leaseId: {
      type: Schema.Types.ObjectId,
      ref: "Lease",
      index: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      index: true,
    },
    payerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    payeeProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
    },
    payerProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "NGN", trim: true },
    status: {
      type: String,
      enum: ["pending", "successful", "failed", "refunded"],
      default: "pending",
    },
    provider: {
      type: String,
      enum: ["paystack", "flutterwave", "manual"],
      required: true,
    },
    purpose: {
      type: String,
      enum: ["rent", "wallet_deposit"],
      default: "rent",
    },
    source: {
      type: String,
      enum: ["paystack", "wallet_lock"],
      default: "paystack",
    },
    providerRef: { type: String, trim: true },
    receiptUrl: { type: String, trim: true },
    receiptNumber: { type: String, trim: true, index: true },
    landlordWalletTxId: {
      type: Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },
    tenantWalletTxId: {
      type: Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },
    rentPeriodIndex: { type: Number, min: 0 },
    rentPeriodStart: { type: Date },
    rentPeriodEnd: { type: Date },
    dueDate: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const Payment = models.Payment || model<IPayment>("Payment", PaymentSchema);
