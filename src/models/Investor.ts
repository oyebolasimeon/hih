import mongoose, { Schema, models, model } from "mongoose";

export interface IInvestor {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  totalInvested: number;
  totalReturns: number;
  portfolioValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const InvestorSchema = new Schema<IInvestor>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    totalInvested: { type: Number, default: 0 },
    totalReturns: { type: Number, default: 0 },
    portfolioValue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Investor =
  models.Investor || model<IInvestor>("Investor", InvestorSchema);
