import mongoose, { Schema, models, model } from "mongoose";

export interface IAutoPaySetting {
  _id: mongoose.Types.ObjectId;
  leaseId: mongoose.Types.ObjectId;
  tenantProfileId: mongoose.Types.ObjectId;
  tenantUserId: mongoose.Types.ObjectId;
  paymentMethodId?: mongoose.Types.ObjectId;
  enabled: boolean;
  includeRent: boolean;
  includeServiceDues: boolean;
  lastRunAt?: Date;
  lastRunStatus?: "success" | "failed" | "skipped";
  lastRunError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AutoPaySettingSchema = new Schema<IAutoPaySetting>(
  {
    leaseId: {
      type: Schema.Types.ObjectId,
      ref: "Lease",
      required: true,
      unique: true,
      index: true,
    },
    tenantProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    tenantUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    paymentMethodId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentMethod",
    },
    enabled: { type: Boolean, default: false, index: true },
    includeRent: { type: Boolean, default: true },
    includeServiceDues: { type: Boolean, default: true },
    lastRunAt: { type: Date },
    lastRunStatus: {
      type: String,
      enum: ["success", "failed", "skipped"],
    },
    lastRunError: { type: String, trim: true },
  },
  { timestamps: true }
);

export const AutoPaySetting =
  models.AutoPaySetting ||
  model<IAutoPaySetting>("AutoPaySetting", AutoPaySettingSchema);
