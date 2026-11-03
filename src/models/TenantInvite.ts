import mongoose, { Schema, models, model } from "mongoose";
import type { LeasePaymentPeriod } from "./Lease";

export type TenantInviteStatus =
  | "pending"
  | "accepted"
  | "cancelled"
  | "expired";

export interface ITenantInvite {
  _id: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  landlordProfileId: mongoose.Types.ObjectId;
  landlordUserId: mongoose.Types.ObjectId;
  tenantName: string;
  tenantEmail: string;
  token: string;
  status: TenantInviteStatus;
  rentAmount: number;
  currency: string;
  paymentPeriod: LeasePaymentPeriod;
  startDate: Date;
  endDate?: Date;
  notes?: string;
  expiresAt: Date;
  acceptedUserId?: mongoose.Types.ObjectId;
  acceptedProfileId?: mongoose.Types.ObjectId;
  leaseId?: mongoose.Types.ObjectId;
  applicationId?: mongoose.Types.ObjectId;
  /** Tenant confirmed landlord identity + invite terms */
  legalAcknowledgedAt?: Date;
  legalAcknowledgementText?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TenantInviteSchema = new Schema<ITenantInvite>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    landlordProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    landlordUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tenantName: { type: String, required: true, trim: true },
    tenantEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    token: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "cancelled", "expired"],
      default: "pending",
      index: true,
    },
    rentAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN", trim: true },
    paymentPeriod: {
      type: String,
      enum: ["monthly", "yearly", "term"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    notes: { type: String, trim: true, maxlength: 2000 },
    expiresAt: { type: Date, required: true, index: true },
    acceptedUserId: { type: Schema.Types.ObjectId, ref: "User" },
    acceptedProfileId: { type: Schema.Types.ObjectId, ref: "Profile" },
    leaseId: { type: Schema.Types.ObjectId, ref: "Lease" },
    applicationId: { type: Schema.Types.ObjectId, ref: "Application" },
    legalAcknowledgedAt: { type: Date },
    legalAcknowledgementText: { type: String, trim: true },
  },
  { timestamps: true }
);

TenantInviteSchema.index({ listingId: 1, status: 1 });

export const TenantInvite =
  models.TenantInvite ||
  model<ITenantInvite>("TenantInvite", TenantInviteSchema);
