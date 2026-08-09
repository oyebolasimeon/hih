import mongoose, { Schema, models, model } from "mongoose";

export type PropertyStatus = "active" | "pending" | "inactive" | "sold";
export type PropertyOwnerType = "investor" | "company";
/** How an investor-held property was acquired from Nova (investors never self-list) */
export type AcquisitionType = "nova_outright" | "nova_investment";
/** percent = return over the set period; fixed_per_1000 = £ return per £1,000 capital over the period */
export type RoiMode = "percent" | "fixed_per_1000";

export interface IProperty {
  _id: mongoose.Types.ObjectId;
  ownerType: PropertyOwnerType;
  investorId?: mongoose.Types.ObjectId | null;
  /** For investor-owned rows: assigned outright by Nova, or via investment */
  acquisitionType?: AcquisitionType | null;
  name: string;
  /** Display-only short name in portal cards */
  nickname: string;
  address: string;
  /** e.g. apartment, house, studio */
  propertyType: string;
  zone: string;
  tags: string[];
  imageUrls: string[];
  status: PropertyStatus;
  purchasePrice: number;
  currentValue: number;
  /** Curated monthly rent used for day/week/month dashboard scaling */
  monthlyRent: number;
  notes?: string;
  /** Public description for investment listings */
  description?: string;
  /** Shown to investors when listedForInvestment */
  listedForInvestment: boolean;
  roiMode: RoiMode;
  /** Percent over period, or £ per £1000 over period */
  roiValue: number;
  roiPeriodMonths: number;
  minInvestment: number;
  maxInvestment?: number | null;
  targetRaise?: number | null;
  highlights?: string[];
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
    acquisitionType: {
      type: String,
      enum: ["nova_outright", "nova_investment"],
      default: null,
    },
    name: { type: String, required: true, trim: true },
    nickname: { type: String, default: "", trim: true },
    address: { type: String, required: true, trim: true },
    propertyType: { type: String, default: "", trim: true },
    zone: { type: String, default: "", trim: true },
    tags: { type: [String], default: [] },
    imageUrls: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["active", "pending", "inactive", "sold"],
      default: "active",
    },
    purchasePrice: { type: Number, default: 0 },
    currentValue: { type: Number, default: 0 },
    monthlyRent: { type: Number, default: 0 },
    notes: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    listedForInvestment: { type: Boolean, default: false, index: true },
    roiMode: {
      type: String,
      enum: ["percent", "fixed_per_1000"],
      default: "percent",
    },
    roiValue: { type: Number, default: 0 },
    roiPeriodMonths: { type: Number, default: 12, min: 1 },
    minInvestment: { type: Number, default: 1000, min: 0 },
    maxInvestment: { type: Number, default: null },
    targetRaise: { type: Number, default: null },
    highlights: { type: [String], default: [] },
  },
  { timestamps: true }
);

PropertySchema.pre("validate", function () {
  if (this.ownerType === "company") {
    this.investorId = null;
    this.acquisitionType = null;
  } else {
    this.listedForInvestment = false;
    if (!this.acquisitionType) {
      this.acquisitionType = "nova_outright";
    }
  }
});

export const Property =
  models.Property || model<IProperty>("Property", PropertySchema);
