import mongoose, { Schema, models, model } from "mongoose";

export type SavingsCadence = "weekly" | "monthly";
export type SavingsStatus = "active" | "completed" | "paused";

export interface ISavingsGoal {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  title: string;
  targetAmount: number;
  savedAmount: number;
  currency: string;
  cadence: SavingsCadence;
  status: SavingsStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SavingsGoalSchema = new Schema<ISavingsGoal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    targetAmount: { type: Number, required: true, min: 1 },
    savedAmount: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "NGN", trim: true },
    cadence: {
      type: String,
      enum: ["weekly", "monthly"],
      default: "monthly",
    },
    status: {
      type: String,
      enum: ["active", "completed", "paused"],
      default: "active",
    },
  },
  { timestamps: true }
);

export const SavingsGoal =
  models.SavingsGoal || model<ISavingsGoal>("SavingsGoal", SavingsGoalSchema);
