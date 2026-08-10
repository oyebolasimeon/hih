import mongoose, { Schema, models, model } from "mongoose";

export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";
export type PaymentProvider = "paystack" | "flutterwave" | "manual";

export interface IPayment {
  _id: mongoose.Types.ObjectId;
  leaseId?: mongoose.Types.ObjectId;
  listingId?: mongoose.Types.ObjectId;
  payerUserId: mongoose.Types.ObjectId;
  payeeProfileId?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: PaymentProvider;
  providerRef?: string;
  receiptUrl?: string;
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    leaseId: {
      type: Schema.Types.ObjectId,
      ref: "Lease",
      index: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      index: true,
    },
    payerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    payeeProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "NGN", trim: true },
    status: {
      type: String,
      enum: ["pending", "successful", "failed", "refunded"],
      default: "pending",
    },
    provider: {
      type: String,
      enum: ["paystack", "flutterwave", "manual"],
      required: true,
    },
    providerRef: { type: String, trim: true },
    receiptUrl: { type: String, trim: true },
    dueDate: { type: Date },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

export const Payment = models.Payment || model<IPayment>("Payment", PaymentSchema);
