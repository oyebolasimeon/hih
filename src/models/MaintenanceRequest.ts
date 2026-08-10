import mongoose, { Schema, models, model } from "mongoose";

export type MaintenancePriority = "low" | "medium" | "high";
export type MaintenanceStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "done";

export interface IMaintenanceRequest {
  _id: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  requesterUserId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignee?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceRequestSchema = new Schema<IMaintenanceRequest>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    requesterUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, required: true, trim: true, maxlength: 4000 },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "assigned", "in_progress", "done"],
      default: "open",
    },
    assignee: { type: String, trim: true, maxlength: 120 },
  },
  { timestamps: true }
);

export const MaintenanceRequest =
  models.MaintenanceRequest ||
  model<IMaintenanceRequest>("MaintenanceRequest", MaintenanceRequestSchema);
