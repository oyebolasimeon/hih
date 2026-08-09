import mongoose, { Schema, models, model } from "mongoose";

export type PropertyStatus = "active" | "inactive" | "sold";

export interface IProperty {
  _id: mongoose.Types.ObjectId;
  investorId: mongoose.Types.ObjectId;
  name: string;
  address: string;
  imageUrls: string[];
  status: PropertyStatus;
  purchasePrice: number;
  currentValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>(
  {
    investorId: {
      type: Schema.Types.ObjectId,
      ref: "Investor",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    imageUrls: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["active", "inactive", "sold"],
      default: "active",
    },
    purchasePrice: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Property =
  models.Property || model<IProperty>("Property", PropertySchema);
