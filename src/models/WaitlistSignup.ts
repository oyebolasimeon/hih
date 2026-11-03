import mongoose, { Schema, models, model } from "mongoose";

export type WaitlistInterest =
  | "tenant"
  | "landlord"
  | "both"
  | "other";

export interface IWaitlistSignup {
  _id: mongoose.Types.ObjectId;
  email: string;
  phone: string;
  name?: string;
  interest?: WaitlistInterest;
  source?: string;
  notifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WaitlistSignupSchema = new Schema<IWaitlistSignup>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    phone: { type: String, required: true, trim: true, index: true },
    name: { type: String, trim: true, maxlength: 120 },
    interest: {
      type: String,
      enum: ["tenant", "landlord", "both", "other"],
      default: "both",
    },
    source: { type: String, trim: true, maxlength: 80, default: "waitlist" },
    notifiedAt: { type: Date },
  },
  { timestamps: true }
);

export const WaitlistSignup =
  models.WaitlistSignup ||
  model<IWaitlistSignup>("WaitlistSignup", WaitlistSignupSchema);
