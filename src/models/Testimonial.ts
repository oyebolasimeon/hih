import mongoose, { Schema, models, model } from "mongoose";

export interface ITestimonial {
  _id: mongoose.Types.ObjectId;
  name: string;
  role: string;
  quote: string;
  photoUrl?: string;
  rating: number;
  order: number;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    quote: { type: String, required: true },
    photoUrl: { type: String, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Testimonial =
  models.Testimonial || model<ITestimonial>("Testimonial", TestimonialSchema);
