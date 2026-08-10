import mongoose, { Schema, models, model } from "mongoose";

export type UtilityCategory =
  | "electricity"
  | "water"
  | "waste"
  | "estate_dues"
  | "internet"
  | "cable";

export type UtilityBillStatus = "pending" | "paid" | "failed";

export interface IUtilityBill {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  category: UtilityCategory;
  provider: string;
  accountNumber: string;
  amount: number;
  currency: string;
  status: UtilityBillStatus;
  providerRef?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UtilityBillSchema = new Schema<IUtilityBill>(
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
    category: {
      type: String,
      enum: [
        "electricity",
        "water",
        "waste",
        "estate_dues",
        "internet",
        "cable",
      ],
      required: true,
    },
    provider: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "NGN", trim: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    providerRef: { type: String, trim: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const UtilityBill =
  models.UtilityBill || model<IUtilityBill>("UtilityBill", UtilityBillSchema);
