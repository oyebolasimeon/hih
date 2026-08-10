import mongoose, { Schema, models, model } from "mongoose";

export type LeaseStatus =
  | "draft"
  | "pending_signature"
  | "active"
  | "terminated"
  | "expired";

export type LeasePaymentPeriod = "monthly" | "yearly" | "term";

export interface ILease {
  _id: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  tenantProfileId: mongoose.Types.ObjectId;
  landlordProfileId: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId;
  status: LeaseStatus;
  startDate: Date;
  endDate?: Date;
  rentAmount: number;
  currency: string;
  paymentPeriod: LeasePaymentPeriod;
  documentUrl?: string;
  termsText?: string;
  tenantSignatureName?: string;
  landlordSignatureName?: string;
  signedAt?: Date;
  tenantSignedAt?: Date;
  landlordSignedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LeaseSchema = new Schema<ILease>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    tenantProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    landlordProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    applicationId: {
      type: Schema.Types.ObjectId,
      ref: "Application",
    },
    status: {
      type: String,
      enum: ["draft", "pending_signature", "active", "terminated", "expired"],
      default: "draft",
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    rentAmount: { type: Number, required: true },
    currency: { type: String, default: "NGN", trim: true },
    paymentPeriod: {
      type: String,
      enum: ["monthly", "yearly", "term"],
      required: true,
    },
    documentUrl: { type: String, trim: true },
    termsText: { type: String },
    tenantSignatureName: { type: String, trim: true },
    landlordSignatureName: { type: String, trim: true },
    signedAt: { type: Date },
    tenantSignedAt: { type: Date },
    landlordSignedAt: { type: Date },
  },
  { timestamps: true }
);

export const Lease = models.Lease || model<ILease>("Lease", LeaseSchema);
