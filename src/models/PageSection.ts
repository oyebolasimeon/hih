import mongoose, { Schema, models, model } from "mongoose";

export type PageSectionStatus = "draft" | "published";

export interface IPageSection {
  _id: mongoose.Types.ObjectId;
  pageKey: string;
  sectionKey: string;
  title?: string;
  data: Record<string, unknown>;
  order: number;
  status: PageSectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PageSectionSchema = new Schema<IPageSection>(
  {
    pageKey: { type: String, required: true, trim: true },
    sectionKey: { type: String, required: true, trim: true },
    title: { type: String, trim: true },
    data: { type: Schema.Types.Mixed, default: {} },
    order: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
  },
  { timestamps: true }
);

PageSectionSchema.index({ pageKey: 1, sectionKey: 1 }, { unique: true });

export const PageSection =
  models.PageSection || model<IPageSection>("PageSection", PageSectionSchema);
