import mongoose, { Schema, models, model } from "mongoose";

export type PropertyStatus = "active" | "inactive" | "sold";
export type PropertyOwnerType = "investor" | "company";

export interface IProperty {
  _id: mongoose.Types.ObjectId;
  ownerType: PropertyOwnerType;
  /** Set for investor-owned properties; null for Nova company portfolio */
  investorId?: mongoose.Types.ObjectId | null;
  name: string;
  address: string;
  imageUrls: string[];
  status: PropertyStatus;
  purchasePrice: number;
  currentValue: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PropertySchema = new Schema<IProperty>(
  {
    ownerType: {
      type: String,
      enum: ["investor", "company"],
      default: "investor",
      index: true,
    },
    investorId: {
      type: Schema.Types.ObjectId,
      ref: "Investor",
      default: null,
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
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

PropertySchema.pre("validate", function () {
  if (this.ownerType === "company") {
    this.investorId = null;
  }
});

export const Property =
  models.Property || model<IProperty>("Property", PropertySchema);
