import mongoose, { Schema, models, model } from "mongoose";

export type RentLockStatus = "active" | "released" | "applied";

export interface IRentLock {
  _id: mongoose.Types.ObjectId;
  walletId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  leaseId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  rentPeriodIndex: number;
  rentPeriodStart: Date;
  rentPeriodEnd: Date;
  status: RentLockStatus;
  paymentId?: mongoose.Types.ObjectId;
  lockWalletTxId?: mongoose.Types.ObjectId;
  releaseWalletTxId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RentLockSchema = new Schema<IRentLock>(
  {
    walletId: {
      type: Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
      index: true,
    },
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    leaseId: {
      type: Schema.Types.ObjectId,
      ref: "Lease",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN", trim: true },
    rentPeriodIndex: { type: Number, required: true, min: 0 },
    rentPeriodStart: { type: Date, required: true },
    rentPeriodEnd: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "released", "applied"],
      default: "active",
      index: true,
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
    lockWalletTxId: { type: Schema.Types.ObjectId, ref: "WalletTransaction" },
    releaseWalletTxId: { type: Schema.Types.ObjectId, ref: "WalletTransaction" },
  },
  { timestamps: true }
);

RentLockSchema.index({ leaseId: 1, rentPeriodIndex: 1, status: 1 });

export const RentLock =
  models.RentLock || model<IRentLock>("RentLock", RentLockSchema);
