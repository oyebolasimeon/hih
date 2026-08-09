import mongoose, { Schema, models, model } from "mongoose";

export type BookingChannel = "direct" | "airbnb" | "booking.com" | "other";
export type BookingStatus = "confirmed" | "pending" | "cancelled";

export interface IBooking {
  _id: mongoose.Types.ObjectId;
  investorId: mongoose.Types.ObjectId;
  propertyId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  guestName?: string;
  revenue: number;
  nightlyRate: number;
  channel: BookingChannel;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    investorId: {
      type: Schema.Types.ObjectId,
      ref: "Investor",
      required: true,
      index: true,
    },
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    guestName: { type: String, trim: true },
    revenue: { type: Number, default: 0 },
    nightlyRate: { type: Number, default: 0 },
    channel: {
      type: String,
      enum: ["direct", "airbnb", "booking.com", "other"],
      default: "direct",
    },
    status: {
      type: String,
      enum: ["confirmed", "pending", "cancelled"],
      default: "confirmed",
    },
  },
  { timestamps: true }
);

BookingSchema.index({ investorId: 1, startDate: 1, endDate: 1 });

export const Booking =
  models.Booking || model<IBooking>("Booking", BookingSchema);
