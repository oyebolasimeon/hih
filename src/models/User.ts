import mongoose, { Schema, models, model } from "mongoose";

export type ThemePreference = "light" | "dark";

export interface IUser {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  theme: ThemePreference;
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
    theme: { type: String, enum: ["light", "dark"], default: "dark" },
  },
  { timestamps: true }
);

export const User = models.User || model<IUser>("User", UserSchema);
