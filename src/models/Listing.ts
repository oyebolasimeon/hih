import mongoose, { Schema, models, model } from "mongoose";

export type ListingType =
  | "hostel"
  | "house"
  | "apartment"
  | "commercial"
  | "other";

export type ListingPricePeriod = "monthly" | "yearly" | "term";

export type ListingAvailabilityStatus =
  | "available"
  | "pending"
  | "occupied"
  | "draft";

export type ListingVerificationStatus =
  | "unverified"
  | "pending"
  | "verified"
  | "rejected";

export interface IListingAddress {
  street: string;
  city: string;
  state: string;
  country: string;
  lat?: number;
  lng?: number;
}

export interface IListingPrice {
  amount: number;
  currency: string;
  period: ListingPricePeriod;
}

export interface IListingImage {
  url: string;
  publicId?: string;
  isPrimary?: boolean;
}

export type ListingLegalProvider = "hih" | "own_legal";

export interface IListingLegalSettings {
  provider: ListingLegalProvider;
  companyName?: string;
  agreementFeePercent?: number;
}

export interface IListing {
  _id: mongoose.Types.ObjectId;
  ownerProfileId: mongoose.Types.ObjectId;
  ownerUserId: mongoose.Types.ObjectId;
  listingType: ListingType;
  title: string;
  description: string;
  address: IListingAddress;
  price: IListingPrice;
  amenities: string[];
  images: IListingImage[];
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  availabilityStatus: ListingAvailabilityStatus;
  verificationStatus: ListingVerificationStatus;
  featured: boolean;
  publishedAt?: Date;
  legalSettings?: IListingLegalSettings;
  createdAt: Date;
  updatedAt: Date;
}

const ListingAddressSchema = new Schema<IListingAddress>(
  {
    street: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, default: "Nigeria", trim: true },
    lat: { type: Number },
    lng: { type: Number },
  },
  { _id: false }
);

const ListingPriceSchema = new Schema<IListingPrice>(
  {
    amount: { type: Number, required: true },
    currency: { type: String, default: "NGN", trim: true },
    period: {
      type: String,
      enum: ["monthly", "yearly", "term"],
      required: true,
    },
  },
  { _id: false }
);

const ListingImageSchema = new Schema<IListingImage>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

const ListingLegalSettingsSchema = new Schema<IListingLegalSettings>(
  {
    provider: {
      type: String,
      enum: ["hih", "own_legal"],
      default: "hih",
    },
    companyName: { type: String, trim: true },
    agreementFeePercent: { type: Number, min: 0, max: 100 },
  },
  { _id: false }
);

const ListingSchema = new Schema<IListing>(
  {
    ownerProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    listingType: {
      type: String,
      enum: ["hostel", "house", "apartment", "commercial", "other"],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    address: { type: ListingAddressSchema, required: true },
    price: { type: ListingPriceSchema, required: true },
    amenities: { type: [String], default: [] },
    images: { type: [ListingImageSchema], default: [] },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    sizeSqm: { type: Number },
    availabilityStatus: {
      type: String,
      enum: ["available", "pending", "occupied", "draft"],
      default: "draft",
    },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "unverified",
    },
    featured: { type: Boolean, default: false },
    publishedAt: { type: Date },
    legalSettings: { type: ListingLegalSettingsSchema },
  },
  { timestamps: true }
);

export const Listing = models.Listing || model<IListing>("Listing", ListingSchema);
