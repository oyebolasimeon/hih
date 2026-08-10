import mongoose, { Schema, models, model } from "mongoose";

export type FraudTargetType = "listing" | "profile" | "user";
export type FraudReportStatus = "open" | "reviewing" | "resolved" | "dismissed";

export interface IFraudReport {
  _id: mongoose.Types.ObjectId;
  reporterUserId: mongoose.Types.ObjectId;
  targetType: FraudTargetType;
  targetId: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  status: FraudReportStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FraudReportSchema = new Schema<IFraudReport>(
  {
    reporterUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ["listing", "profile", "user"],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reason: { type: String, required: true, trim: true },
    details: { type: String, trim: true },
    status: {
      type: String,
      enum: ["open", "reviewing", "resolved", "dismissed"],
      default: "open",
    },
  },
  { timestamps: true }
);

export const FraudReport =
  models.FraudReport || model<IFraudReport>("FraudReport", FraudReportSchema);
