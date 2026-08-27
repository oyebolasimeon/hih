import mongoose, { Schema, models, model } from "mongoose";

export type ComplaintCategory =
  | "noise"
  | "billing"
  | "maintenance"
  | "safety"
  | "neighbor"
  | "lease"
  | "other";

export type ComplaintStatus =
  | "open"
  | "acknowledged"
  | "in_progress"
  | "resolved"
  | "dismissed";

export interface IComplaint {
  _id: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  leaseId?: mongoose.Types.ObjectId;
  reporterUserId: mongoose.Types.ObjectId;
  reporterProfileId: mongoose.Types.ObjectId;
  landlordUserId: mongoose.Types.ObjectId;
  category: ComplaintCategory;
  title: string;
  details: string;
  status: ComplaintStatus;
  landlordNotes?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    leaseId: {
      type: Schema.Types.ObjectId,
      ref: "Lease",
      index: true,
    },
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
    category: {
      type: String,
      enum: [
        "noise",
        "billing",
        "maintenance",
        "safety",
        "neighbor",
        "lease",
        "other",
      ],
      default: "other",
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    details: { type: String, required: true, trim: true, maxlength: 4000 },
    status: {
      type: String,
      enum: ["open", "acknowledged", "in_progress", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
    landlordNotes: { type: String, trim: true, maxlength: 2000 },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export const Complaint =
  models.Complaint || model<IComplaint>("Complaint", ComplaintSchema);
