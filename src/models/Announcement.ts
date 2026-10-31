import mongoose, { Schema, models, model } from "mongoose";

export type AnnouncementAudience =
  | "all"
  | "landlords"
  | "tenants"
  | "students"
  | "estate_managers";

export interface IAnnouncement {
  _id: mongoose.Types.ObjectId;
  title: string;
  subtitle?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  imageUrl?: string;
  audience: AnnouncementAudience;
  /** Show as site-wide popup while active */
  showModal: boolean;
  /** Send email blast when published (once) */
  sendEmail: boolean;
  active: boolean;
  publishedAt?: Date;
  expiresAt?: Date | null;
  emailSentAt?: Date | null;
  emailSentCount?: number;
  emailFailedCount?: number;
  createdByUserId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    subtitle: { type: String, trim: true, maxlength: 300, default: "" },
    body: { type: String, required: true, maxlength: 20000 },
    ctaLabel: { type: String, trim: true, maxlength: 80, default: "" },
    ctaUrl: { type: String, trim: true, maxlength: 500, default: "" },
    imageUrl: { type: String, trim: true, maxlength: 1000, default: "" },
    audience: {
      type: String,
      enum: ["all", "landlords", "tenants", "students", "estate_managers"],
      default: "all",
    },
    showModal: { type: Boolean, default: true },
    sendEmail: { type: Boolean, default: true },
    active: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    expiresAt: { type: Date, default: null },
    emailSentAt: { type: Date, default: null },
    emailSentCount: { type: Number, default: 0 },
    emailFailedCount: { type: Number, default: 0 },
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ active: 1, showModal: 1, publishedAt: -1 });

export const Announcement =
  models.Announcement || model<IAnnouncement>("Announcement", AnnouncementSchema);
