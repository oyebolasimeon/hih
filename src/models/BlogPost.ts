import mongoose, { Schema, models, model } from "mongoose";

export type BlogPostStatus = "draft" | "scheduled" | "published" | "archived";

export interface IBlogPostSeo {
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
}

export interface IBlogPost {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  featuredImageUrl?: string;
  authorName?: string;
  categories: string[];
  tags: string[];
  status: BlogPostStatus;
  publishedAt?: Date;
  scheduledFor?: Date;
  seo: IBlogPostSeo;
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSeoSchema = new Schema<IBlogPostSeo>(
  {
    metaTitle: { type: String, trim: true },
    metaDescription: { type: String, trim: true },
    ogImageUrl: { type: String, trim: true },
  },
  { _id: false }
);

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    excerpt: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    featuredImageUrl: { type: String, trim: true },
    authorName: { type: String, trim: true },
    categories: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["draft", "scheduled", "published", "archived"],
      default: "draft",
    },
    publishedAt: { type: Date },
    scheduledFor: { type: Date },
    seo: { type: BlogPostSeoSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export const BlogPost =
  models.BlogPost || model<IBlogPost>("BlogPost", BlogPostSchema);
