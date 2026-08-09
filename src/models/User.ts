import mongoose, { Schema, models, model } from "mongoose";

export type ThemePreference = "light" | "dark";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  phone: string;
  emailNotifications: boolean;
  /** false = must verify email before sign-in; missing/true = allowed */
  emailVerified: boolean;
  theme: ThemePreference;
  starredImageUrls: string[];
  bookmarkedImageUrls: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    emailNotifications: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: true },
    theme: { type: String, enum: ["light", "dark"], default: "dark" },
    starredImageUrls: { type: [String], default: [] },
    bookmarkedImageUrls: { type: [String], default: [] },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);
