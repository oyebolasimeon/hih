import mongoose, { Schema, models, model } from "mongoose";

export interface IFaqItem {
  _id: mongoose.Types.ObjectId;
  question: string;
  answer: string;
  category?: string;
  order: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FaqItemSchema = new Schema<IFaqItem>(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true },
    category: { type: String, trim: true },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const FaqItem = models.FaqItem || model<IFaqItem>("FaqItem", FaqItemSchema);
