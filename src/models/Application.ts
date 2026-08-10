import mongoose, { Schema, models, model } from "mongoose";

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "withdrawn";

export interface IApplication {
  _id: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  applicantProfileId: mongoose.Types.ObjectId;
  applicantUserId: mongoose.Types.ObjectId;
  landlordProfileId: mongoose.Types.ObjectId;
  message?: string;
  status: ApplicationStatus;
  landlordNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    applicantProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    applicantUserId: {
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
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ["submitted", "under_review", "approved", "rejected", "withdrawn"],
      default: "submitted",
    },
    landlordNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Application =
  models.Application || model<IApplication>("Application", ApplicationSchema);
