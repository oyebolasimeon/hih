import mongoose, { Schema, models, model } from "mongoose";

export type ExitNoticeType =
  | "landlord_quit"
  | "tenant_early_exit"
  | "mutual"
  | "expiry";

export type ExitNoticeStatus =
  | "draft"
  | "pending_ai"
  | "pending_review"
  | "approved"
  | "rejected"
  | "served"
  | "acknowledged"
  | "completed"
  | "cancelled";

export type ExitAiRecommendation = "approve" | "manual_review" | "reject";

export type ExitRefundStatus =
  | "none"
  | "pending_admin"
  | "refunded"
  | "denied"
  | "not_applicable";

export interface IExitNotice {
  _id: mongoose.Types.ObjectId;
  leaseId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  tenantProfileId: mongoose.Types.ObjectId;
  landlordProfileId: mongoose.Types.ObjectId;
  initiatedBy: "landlord" | "tenant" | "admin";
  initiatedByUserId: mongoose.Types.ObjectId;
  noticeType: ExitNoticeType;
  reason: string;
  proposedVacateDate: Date;
  status: ExitNoticeStatus;
  /** Lease terms excerpt / notice body stored for legal PDF */
  termsText: string;
  legalProvider: "hih" | "own_legal";
  legalCompanyName?: string;
  documentNumber?: string;
  documentUrl?: string;
  aiRecommendation?: ExitAiRecommendation;
  aiConfidence?: number;
  aiReasons?: string[];
  requiresManualReview: boolean;
  reviewerUserId?: mongoose.Types.ObjectId;
  reviewerNotes?: string;
  reviewedAt?: Date;
  servedAt?: Date;
  tenantAcknowledgedAt?: Date;
  tenantAcknowledgementText?: string;
  completedAt?: Date;
  unpaidRentDetected: boolean;
  suggestedRemainingRentRefund?: number;
  remainingRentRefundAmount?: number;
  remainingRentRefundCurrency?: string;
  remainingRentRefundPaymentId?: mongoose.Types.ObjectId;
  refundStatus: ExitRefundStatus;
  refundDecisionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExitNoticeSchema = new Schema<IExitNotice>(
  {
    leaseId: {
      type: Schema.Types.ObjectId,
      ref: "Lease",
      required: true,
      index: true,
    },
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
    initiatedBy: {
      type: String,
      enum: ["landlord", "tenant", "admin"],
      required: true,
    },
    initiatedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    noticeType: {
      type: String,
      enum: ["landlord_quit", "tenant_early_exit", "mutual", "expiry"],
      required: true,
    },
    reason: { type: String, required: true, trim: true, maxlength: 4000 },
    proposedVacateDate: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        "draft",
        "pending_ai",
        "pending_review",
        "approved",
        "rejected",
        "served",
        "acknowledged",
        "completed",
        "cancelled",
      ],
      default: "pending_ai",
      index: true,
    },
    termsText: { type: String, required: true },
    legalProvider: {
      type: String,
      enum: ["hih", "own_legal"],
      default: "hih",
    },
    legalCompanyName: { type: String, trim: true },
    documentNumber: { type: String, trim: true },
    documentUrl: { type: String, trim: true },
    aiRecommendation: {
      type: String,
      enum: ["approve", "manual_review", "reject"],
    },
    aiConfidence: { type: Number, min: 0, max: 1 },
    aiReasons: { type: [String], default: [] },
    requiresManualReview: { type: Boolean, default: true },
    reviewerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    reviewerNotes: { type: String, trim: true, maxlength: 4000 },
    reviewedAt: { type: Date },
    servedAt: { type: Date },
    tenantAcknowledgedAt: { type: Date },
    tenantAcknowledgementText: { type: String, trim: true },
    completedAt: { type: Date },
    unpaidRentDetected: { type: Boolean, default: false },
    suggestedRemainingRentRefund: { type: Number, min: 0 },
    remainingRentRefundAmount: { type: Number, min: 0 },
    remainingRentRefundCurrency: { type: String, trim: true, default: "NGN" },
    remainingRentRefundPaymentId: {
      type: Schema.Types.ObjectId,
      ref: "Payment",
    },
    refundStatus: {
      type: String,
      enum: ["none", "pending_admin", "refunded", "denied", "not_applicable"],
      default: "none",
      index: true,
    },
    refundDecisionNotes: { type: String, trim: true, maxlength: 4000 },
  },
  { timestamps: true }
);

ExitNoticeSchema.index({ status: 1, createdAt: -1 });
ExitNoticeSchema.index({ landlordProfileId: 1, status: 1 });
ExitNoticeSchema.index({ tenantProfileId: 1, status: 1 });

export const ExitNotice =
  models.ExitNotice || model<IExitNotice>("ExitNotice", ExitNoticeSchema);
