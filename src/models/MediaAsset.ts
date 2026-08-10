import mongoose, { Schema, models, model } from "mongoose";

export interface IMediaAsset {
  _id: mongoose.Types.ObjectId;
  url: string;
  publicId?: string;
  filename: string;
  mimeType?: string;
  bytes?: number;
  alt?: string;
  uploadedBy?: mongoose.Types.ObjectId;
  folder?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MediaAssetSchema = new Schema<IMediaAsset>(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    filename: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true },
    bytes: { type: Number },
    alt: { type: String, trim: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
    folder: { type: String, trim: true },
  },
  { timestamps: true }
);

export const MediaAsset =
  models.MediaAsset || model<IMediaAsset>("MediaAsset", MediaAssetSchema);
