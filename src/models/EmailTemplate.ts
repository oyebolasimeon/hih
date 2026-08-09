import mongoose, { Schema, models, model } from "mongoose";
import type { EmailAction } from "@/lib/email-templates";

export interface IEmailTemplate {
  _id: mongoose.Types.ObjectId;
  name: string;
  subject: string;
  html: string;
  /** When true, used for any action without a dedicated template */
  isDefault: boolean;
  /** Actions this template is attached to (exclusive across templates) */
  actions: EmailAction[];
  active: boolean;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    html: { type: String, required: true },
    isDefault: { type: Boolean, default: false, index: true },
    actions: {
      type: [String],
      default: [],
      index: true,
    },
    active: { type: Boolean, default: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const EmailTemplate =
  models.EmailTemplate ||
  model<IEmailTemplate>("EmailTemplate", EmailTemplateSchema);
