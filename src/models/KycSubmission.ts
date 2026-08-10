import mongoose, { Schema, models, model } from "mongoose";
import type { ProfileType } from "./Profile";

export type KycStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "failed";

export type KycCheckType =
  | "nin_face"
  | "bvn_face"
  | "cac"
  | "student_id"
  | "manual";

export type KycCheckStatus = "pending" | "passed" | "failed" | "skipped";

export interface IKycDocument {
  kind: string;
  url: string;
  filename?: string;
  publicId?: string;
}

export interface IKycCheck {
  type: KycCheckType;
  status: KycCheckStatus;
  provider: "prembly" | "manual";
  reference?: string;
  message?: string;
  confidence?: number;
  faceMatched?: boolean;
  identity?: Record<string, unknown>;
  raw?: unknown;
  checkedAt?: Date;
}

export interface IKycSubmission {
  _id: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileType: ProfileType;
  status: KycStatus;
  provider: "prembly";
  /** Masked only — never store full NIN/BVN */
  ninMasked?: string;
  bvnMasked?: string;
  documents: IKycDocument[];
  selfieUrl?: string;
  selfiePublicId?: string;
  checks: IKycCheck[];
  /** True when Prembly auto-checks passed but student ID (or other) needs Ops */
  requiresManualReview: boolean;
  reviewerNotes?: string;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KycDocumentSchema = new Schema<IKycDocument>(
  {
    kind: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    filename: { type: String, trim: true },
    publicId: { type: String, trim: true },
  },
  { _id: false }
);

const KycCheckSchema = new Schema<IKycCheck>(
  {
    type: {
      type: String,
      enum: ["nin_face", "bvn_face", "cac", "student_id", "manual"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "passed", "failed", "skipped"],
      default: "pending",
    },
    provider: { type: String, enum: ["prembly", "manual"], default: "prembly" },
    reference: { type: String, trim: true },
    message: { type: String, trim: true },
    confidence: { type: Number },
    faceMatched: { type: Boolean },
    identity: { type: Schema.Types.Mixed },
    raw: { type: Schema.Types.Mixed },
    checkedAt: { type: Date },
  },
  { _id: false }
);

const KycSubmissionSchema = new Schema<IKycSubmission>(
  {
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
    profileType: {
      type: String,
      enum: ["student", "tenant", "landlord", "estate_manager"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected", "failed"],
      default: "pending",
      index: true,
    },
    provider: { type: String, enum: ["prembly"], default: "prembly" },
    ninMasked: { type: String, trim: true },
    bvnMasked: { type: String, trim: true },
    documents: { type: [KycDocumentSchema], default: [] },
    selfieUrl: { type: String, trim: true },
    selfiePublicId: { type: String, trim: true },
    checks: { type: [KycCheckSchema], default: [] },
    requiresManualReview: { type: Boolean, default: false },
    reviewerNotes: { type: String, trim: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "Admin" },
    reviewedAt: { type: Date },
    failureReason: { type: String, trim: true },
  },
  { timestamps: true }
);

KycSubmissionSchema.index({ profileId: 1, createdAt: -1 });
KycSubmissionSchema.index({ status: 1, requiresManualReview: 1 });

export const KycSubmission =
  models.KycSubmission ||
  model<IKycSubmission>("KycSubmission", KycSubmissionSchema);
