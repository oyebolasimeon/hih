import mongoose, { Schema, models, model } from "mongoose";
import type { AdminRole, Permission } from "@/lib/rbac";

export interface IAdmin {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  email: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
  source: "env" | "invite";
  active: boolean;
  createdBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AdminSchema = new Schema<IAdmin>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    role: {
      type: String,
      enum: ["superadmin", "content_editor", "ops_kyc"],
      default: "ops_kyc",
    },
    permissions: { type: [String], default: [] },
    source: { type: String, enum: ["env", "invite"], default: "invite" },
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Admin = models.Admin || model<IAdmin>("Admin", AdminSchema);
