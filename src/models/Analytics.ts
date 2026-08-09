import mongoose, { Schema, models, model } from "mongoose";

export interface IAnalytics {
  _id: mongoose.Types.ObjectId;
  investorId: mongoose.Types.ObjectId;
  period: string;
  revenue: number;
  commission: number;
  occupancyRate: number;
  avgNightlyRate: number;
  /** Revenue per available listing / unit (admin-curated) */
  revenuePAL: number;
  channelBreakdown: Map<string, number> | Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsSchema = new Schema<IAnalytics>(
  {
    investorId: {
      type: Schema.Types.ObjectId,
      ref: "Investor",
      required: true,
      index: true,
    },
    period: { type: String, required: true }, // YYYY-MM
    revenue: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },
    occupancyRate: { type: Number, default: 0 },
    avgNightlyRate: { type: Number, default: 0 },
    revenuePAL: { type: Number, default: 0 },
    channelBreakdown: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

AnalyticsSchema.index({ investorId: 1, period: 1 }, { unique: true });

export const Analytics =
  models.Analytics || model<IAnalytics>("Analytics", AnalyticsSchema);
