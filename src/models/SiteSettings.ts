import mongoose, { Schema, models, model } from "mongoose";

export interface ISiteSettings {
  _id: mongoose.Types.ObjectId;
  key: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: Record<string, unknown>;
  footerLinkGroups?: Record<string, unknown>;
  seoDefaults?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
      trim: true,
    },
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: { type: String, trim: true },
    socialLinks: { type: Schema.Types.Mixed },
    footerLinkGroups: { type: Schema.Types.Mixed },
    seoDefaults: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const SiteSettings =
  models.SiteSettings || model<ISiteSettings>("SiteSettings", SiteSettingsSchema);
