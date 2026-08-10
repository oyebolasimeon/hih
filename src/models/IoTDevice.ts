import mongoose, { Schema, models, model } from "mongoose";

export type IoTDeviceType = "lock" | "meter" | "sensor";
export type IoTDeviceStatus = "online" | "offline" | "pairing";

export interface IIoTDevice {
  _id: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  listingId?: mongoose.Types.ObjectId;
  name: string;
  type: IoTDeviceType;
  status: IoTDeviceStatus;
  externalId?: string;
  lastTelemetry?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const IoTDeviceSchema = new Schema<IIoTDevice>(
  {
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: {
      type: String,
      enum: ["lock", "meter", "sensor"],
      required: true,
    },
    status: {
      type: String,
      enum: ["online", "offline", "pairing"],
      default: "pairing",
    },
    externalId: { type: String, trim: true },
    lastTelemetry: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const IoTDevice =
  models.IoTDevice || model<IIoTDevice>("IoTDevice", IoTDeviceSchema);
