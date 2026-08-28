import mongoose, { Schema, models, model } from "mongoose";

export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";
export type PaymentProvider = "paystack" | "flutterwave" | "manual";
export type PaymentPurpose = "rent" | "wallet_deposit" | "agreement_fee";
export type PaymentSource = "paystack" | "wallet_lock";

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  leaseId?: mongoose.Types.ObjectId;
  listingId?: mongoose.Types.ObjectId;
  payerUserId: mongoose.Types.ObjectId;
  payeeProfileId?: mongoose.Types.ObjectId;
  payerProfileId?: mongoose.Types.ObjectId;
  platformProfileId?: mongoose.Types.ObjectId;
  amount: number;
  grossAmount?: number;
  platformFeeAmount?: number;
  agreementFeeAmount?: number;
  netPayeeAmount?: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  purpose: PaymentPurpose;
  source: PaymentSource;
  legalProvider?: "hih" | "own_legal";
  legalCompanyName?: string;
  providerRef?: string;
  receiptUrl?: string;
  receiptNumber?: string;
  receiptPdfUrl?: string;
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
    platformProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
    },
    amount: { type: Number, required: true },
    grossAmount: { type: Number, min: 0 },
    platformFeeAmount: { type: Number, min: 0, default: 0 },
    agreementFeeAmount: { type: Number, min: 0, default: 0 },
    netPayeeAmount: { type: Number, min: 0 },
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
      enum: ["rent", "wallet_deposit", "agreement_fee"],
      default: "rent",
    },
    source: {
      type: String,
      enum: ["paystack", "wallet_lock"],
      default: "paystack",
    },
    legalProvider: {
      type: String,
      enum: ["hih", "own_legal"],
    },
    legalCompanyName: { type: String, trim: true },
    providerRef: { type: String, trim: true },
    receiptUrl: { type: String, trim: true },
    receiptNumber: { type: String, trim: true, index: true },
    receiptPdfUrl: { type: String, trim: true },
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
