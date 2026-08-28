import mongoose, { Schema, models, model } from "mongoose";
import type { BrandingSettings } from "@/lib/branding-defaults";

export type {
  BrandFontOption,
  BrandingSettings,
} from "@/lib/branding-defaults";
export {
  BRAND_FONT_OPTIONS,
  DEFAULT_BRANDING,
} from "@/lib/branding-defaults";

export interface ISiteSettings {
  _id: mongoose.Types.ObjectId;
  key: string;
  contactEmail?: string;
  contactPhone?: string;
  socialLinks?: Record<string, unknown>;
  footerLinkGroups?: Record<string, unknown>;
  seoDefaults?: Record<string, unknown>;
  /** Branding — logo, auth bg, colors, fonts */
  branding?: Partial<BrandingSettings>;
  /** Platform fee percentages */
  fees?: {
    agreementFeePercent?: number;
    platformFeeMinPercent?: number;
    platformFeePercentOwnLegal?: number;
  };
  /** Withdrawal payout provider and fee */
  payoutSettings?: {
    provider?: "paystack" | "manual";
    withdrawalFee?: number;
  };
  platformWalletProfileId?: mongoose.Types.ObjectId;
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
    branding: { type: Schema.Types.Mixed },
    fees: { type: Schema.Types.Mixed },
    payoutSettings: { type: Schema.Types.Mixed },
    platformWalletProfileId: { type: Schema.Types.ObjectId, ref: "Profile" },
  },
  { timestamps: true }
);

export const SiteSettings =
  models.SiteSettings || model<ISiteSettings>("SiteSettings", SiteSettingsSchema);
