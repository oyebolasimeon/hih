import mongoose, { Schema, models, model } from "mongoose";

export type CreditBand = "poor" | "fair" | "good" | "very_good" | "excellent";

export interface ICreditFactor {
  key: string;
  label: string;
  impact: number;
  detail?: string;
}

export interface ICreditScore {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  score: number;
  band: CreditBand;
  factors: ICreditFactor[];
  computedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CreditFactorSchema = new Schema<ICreditFactor>(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    impact: { type: Number, required: true },
    detail: { type: String, trim: true },
  },
  { _id: false }
);

const CreditScoreSchema = new Schema<ICreditScore>(
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
    score: { type: Number, required: true, min: 300, max: 850 },
    band: {
      type: String,
      enum: ["poor", "fair", "good", "very_good", "excellent"],
      required: true,
    },
    factors: { type: [CreditFactorSchema], default: [] },
    computedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

CreditScoreSchema.index({ userId: 1, profileId: 1 }, { unique: true });

export const CreditScore =
  models.CreditScore || model<ICreditScore>("CreditScore", CreditScoreSchema);
