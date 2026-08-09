import mongoose, { Schema, models, model } from "mongoose";
import type { RoiMode } from "@/models/Property";

export type InterestStatus =
  | "pending"
  | "contacted"
  | "accepted"
  | "withdrawn"
  | "rejected";

export interface IInvestmentInterest {
  _id: mongoose.Types.ObjectId;
  investorId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  amount: number;
  status: InterestStatus;
  /** Snapshot of projections at time of pledge */
  projectedProfit: number;
  projectedTotalReturn: number;
  annualizedRoiPercent: number;
  monthlyAverageProfit: number;
  multiple: number;
  roiMode: RoiMode;
  roiValue: number;
  roiPeriodMonths: number;
  note?: string;
  adminNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvestmentInterestSchema = new Schema<IInvestmentInterest>(
  {
    investorId: {
      type: Schema.Types.ObjectId,
      ref: "Investor",
      required: true,
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["pending", "contacted", "accepted", "withdrawn", "rejected"],
      default: "pending",
      index: true,
    },
    projectedProfit: { type: Number, default: 0 },
    projectedTotalReturn: { type: Number, default: 0 },
    annualizedRoiPercent: { type: Number, default: 0 },
    monthlyAverageProfit: { type: Number, default: 0 },
    multiple: { type: Number, default: 1 },
    roiMode: {
      type: String,
      enum: ["percent", "fixed_per_1000"],
      required: true,
    },
    roiValue: { type: Number, required: true },
    roiPeriodMonths: { type: Number, required: true },
    note: { type: String, default: "", trim: true },
    adminNote: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

InvestmentInterestSchema.index({ investorId: 1, propertyId: 1, createdAt: -1 });

export const InvestmentInterest =
  models.InvestmentInterest ||
  model<IInvestmentInterest>("InvestmentInterest", InvestmentInterestSchema);
