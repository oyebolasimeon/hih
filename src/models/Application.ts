import mongoose, { Schema, models, model } from "mongoose";

export type ApplicationStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "withdrawn";

export type ApplicationSource = "marketplace" | "landlord_invite";

export interface IApplication {
  _id: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  applicantProfileId: mongoose.Types.ObjectId;
  applicantUserId: mongoose.Types.ObjectId;
  landlordProfileId: mongoose.Types.ObjectId;
  message?: string;
  status: ApplicationStatus;
  /** marketplace apply vs landlord invite for existing occupancy */
  source?: ApplicationSource;
  inviteId?: mongoose.Types.ObjectId;
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
    source: {
      type: String,
      enum: ["marketplace", "landlord_invite"],
      default: "marketplace",
    },
    inviteId: {
      type: Schema.Types.ObjectId,
      ref: "TenantInvite",
    },
    landlordNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Application =
  models.Application || model<IApplication>("Application", ApplicationSchema);
