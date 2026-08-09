import mongoose, { Schema, models, model } from "mongoose";

export const INVESTOR_LOGIN_MODAL_KEY = "investor_login_modal";
export const AUTH_BACKGROUND_KEY = "auth_background";

export interface ISiteContent {
  _id: mongoose.Types.ObjectId;
  key: string;
  title: string;
  body: string;
  ctaLabel: string;
  imageUrl?: string;
  imagePublicId?: string;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SiteContentSchema = new Schema<ISiteContent>(
  {
    key: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    ctaLabel: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const SiteContent =
  models.SiteContent || model<ISiteContent>("SiteContent", SiteContentSchema);
