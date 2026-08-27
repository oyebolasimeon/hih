import mongoose, { Schema, models, model } from "mongoose";

export type UtilityCategory =
  | "electricity"
  | "water"
  | "waste"
  | "estate_dues"
  | "internet"
  | "cable";

export type UtilityBillStatus = "pending" | "paid" | "failed";
export type UtilityMeterType = "prepaid" | "postpaid";
export type UtilityIntegration = "vtpass" | "manual";

export interface IUtilityBill {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  category: UtilityCategory;
  provider: string;
  providerId: string;
  accountNumber: string;
  meterType?: UtilityMeterType;
  customerName?: string;
  customerAddress?: string;
  phone?: string;
  amount: number;
  currency: string;
  status: UtilityBillStatus;
  integration: UtilityIntegration;
  providerRef?: string;
  paystackRef?: string;
  vtpassRequestId?: string;
  purchaseToken?: string;
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
    providerId: { type: String, required: true, trim: true, default: "manual" },
    accountNumber: { type: String, required: true, trim: true },
    meterType: {
      type: String,
      enum: ["prepaid", "postpaid"],
    },
    customerName: { type: String, trim: true },
    customerAddress: { type: String, trim: true },
    phone: { type: String, trim: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "NGN", trim: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    integration: {
      type: String,
      enum: ["vtpass", "manual"],
      default: "manual",
    },
    providerRef: { type: String, trim: true },
    paystackRef: { type: String, trim: true, index: true },
    vtpassRequestId: { type: String, trim: true },
    purchaseToken: { type: String, trim: true },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const UtilityBill =
  models.UtilityBill || model<IUtilityBill>("UtilityBill", UtilityBillSchema);
