import mongoose, { Schema, models, model } from "mongoose";

export type PropertyServiceCategory =
  | "cleaning"
  | "security"
  | "waste"
  | "generator"
  | "water"
  | "internet"
  | "estate_dues"
  | "maintenance"
  | "other";

export type PropertyServiceBilling =
  | "one_time"
  | "monthly"
  | "yearly"
  | "included";

export interface IPropertyService {
  _id: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  ownerUserId: mongoose.Types.ObjectId;
  ownerProfileId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  category: PropertyServiceCategory;
  price: number;
  currency: string;
  billing: PropertyServiceBilling;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PropertyServiceSchema = new Schema<IPropertyService>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ownerProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    category: {
      type: String,
      enum: [
        "cleaning",
        "security",
        "waste",
        "generator",
        "water",
        "internet",
        "estate_dues",
        "maintenance",
        "other",
      ],
      default: "other",
    },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN", trim: true },
    billing: {
      type: String,
      enum: ["one_time", "monthly", "yearly", "included"],
      default: "monthly",
    },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

PropertyServiceSchema.index({ listingId: 1, active: 1 });

export const PropertyService =
  models.PropertyService ||
  model<IPropertyService>("PropertyService", PropertyServiceSchema);
