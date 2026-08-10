import mongoose, { Schema, models, model } from "mongoose";

export interface IReview {
  _id: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  reviewerUserId: mongoose.Types.ObjectId;
  reviewerProfileId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    reviewerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reviewerProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

ReviewSchema.index({ listingId: 1, reviewerUserId: 1 }, { unique: true });

export const Review =
  models.Review || model<IReview>("Review", ReviewSchema);
