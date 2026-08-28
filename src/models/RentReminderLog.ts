import mongoose, { Schema, models, model } from "mongoose";

export interface IRentReminderLog {
  _id: mongoose.Types.ObjectId;
  dedupeKey: string;
  leaseId?: mongoose.Types.ObjectId;
  kind: string;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RentReminderLogSchema = new Schema<IRentReminderLog>(
  {
    dedupeKey: { type: String, required: true, unique: true, trim: true, index: true },
    leaseId: { type: Schema.Types.ObjectId, ref: "Lease", index: true },
    kind: { type: String, required: true, trim: true },
    sentAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export const RentReminderLog =
  models.RentReminderLog ||
  model<IRentReminderLog>("RentReminderLog", RentReminderLogSchema);
