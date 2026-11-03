import mongoose, { Schema, models, model } from "mongoose";

export type BuildingIssueCategory =
  | "plumbing"
  | "electrical"
  | "structural"
  | "pest"
  | "security"
  | "common_area"
  | "water"
  | "waste"
  | "noise_facility"
  | "other";

export type BuildingIssuePriority = "low" | "medium" | "high" | "urgent";

export type BuildingIssueStatus =
  | "submitted"
  | "pending_ai"
  | "needs_more_proof"
  | "ai_validated"
  | "escalated"
  | "landlord_in_progress"
  | "closed"
  | "dismissed";

export type BuildingAiRecommendation =
  | "escalate"
  | "needs_more_proof"
  | "dismiss"
  | "manual_review";

export interface IBuildingIssueEvidence {
  url: string;
  publicId?: string;
  kind: "photo" | "video" | "document";
  caption?: string;
  uploadedAt: Date;
}

export interface IBuildingIssueEvent {
  at: Date;
  actor: "tenant" | "landlord" | "ai_pm" | "system";
  type: string;
  message: string;
}

export interface IBuildingIssue {
  _id: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  leaseId?: mongoose.Types.ObjectId;
  reporterUserId: mongoose.Types.ObjectId;
  reporterProfileId: mongoose.Types.ObjectId;
  landlordUserId: mongoose.Types.ObjectId;
  landlordProfileId: mongoose.Types.ObjectId;
  category: BuildingIssueCategory;
  title: string;
  description: string;
  locationNote?: string;
  priority: BuildingIssuePriority;
  status: BuildingIssueStatus;
  evidence: IBuildingIssueEvidence[];
  aiRecommendation?: BuildingAiRecommendation;
  aiConfidence?: number;
  aiSummary?: string;
  aiReasons?: string[];
  recommendedLandlordActions?: string[];
  proofSufficient?: boolean;
  landlordNotes?: string;
  landlordActionTaken?: string;
  maintenanceRequestId?: mongoose.Types.ObjectId;
  closedAt?: Date;
  closedBy?: "tenant" | "landlord" | "ai_pm" | "system";
  timeline: IBuildingIssueEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const EvidenceSchema = new Schema<IBuildingIssueEvidence>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    kind: {
      type: String,
      enum: ["photo", "video", "document"],
      default: "photo",
    },
    caption: { type: String, trim: true, maxlength: 240 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const EventSchema = new Schema<IBuildingIssueEvent>(
  {
    at: { type: Date, default: Date.now },
    actor: {
      type: String,
      enum: ["tenant", "landlord", "ai_pm", "system"],
      required: true,
    },
    type: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { _id: false }
);

const BuildingIssueSchema = new Schema<IBuildingIssue>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    leaseId: { type: Schema.Types.ObjectId, ref: "Lease", index: true },
    reporterUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reporterProfileId: {
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
    landlordProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: [
        "plumbing",
        "electrical",
        "structural",
        "pest",
        "security",
        "common_area",
        "water",
        "waste",
        "noise_facility",
        "other",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    locationNote: { type: String, trim: true, maxlength: 240 },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: [
        "submitted",
        "pending_ai",
        "needs_more_proof",
        "ai_validated",
        "escalated",
        "landlord_in_progress",
        "closed",
        "dismissed",
      ],
      default: "pending_ai",
      index: true,
    },
    evidence: { type: [EvidenceSchema], default: [] },
    aiRecommendation: {
      type: String,
      enum: ["escalate", "needs_more_proof", "dismiss", "manual_review"],
    },
    aiConfidence: { type: Number, min: 0, max: 1 },
    aiSummary: { type: String, trim: true, maxlength: 2000 },
    aiReasons: { type: [String], default: [] },
    recommendedLandlordActions: { type: [String], default: [] },
    proofSufficient: { type: Boolean },
    landlordNotes: { type: String, trim: true, maxlength: 4000 },
    landlordActionTaken: { type: String, trim: true, maxlength: 4000 },
    maintenanceRequestId: {
      type: Schema.Types.ObjectId,
      ref: "MaintenanceRequest",
    },
    closedAt: { type: Date },
    closedBy: {
      type: String,
      enum: ["tenant", "landlord", "ai_pm", "system"],
    },
    timeline: { type: [EventSchema], default: [] },
  },
  { timestamps: true }
);

BuildingIssueSchema.index({ listingId: 1, status: 1 });
BuildingIssueSchema.index({ reporterUserId: 1, createdAt: -1 });
BuildingIssueSchema.index({ landlordUserId: 1, status: 1 });

export const BuildingIssue =
  models.BuildingIssue ||
  model<IBuildingIssue>("BuildingIssue", BuildingIssueSchema);
