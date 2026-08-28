import mongoose, { Schema, models, model } from "mongoose";

export type WalletOwnerType =
  | "tenant"
  | "student"
  | "landlord"
  | "estate_manager"
  | "platform";

export interface IWalletBankDetails {
  bankCode: string;
  bankName: string;
  accountName: string;
  accountNumberLast4: string;
  accountNumber?: string;
  paystackRecipientCode?: string;
}

export interface IWallet {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  ownerType: WalletOwnerType;
  currency: string;
  availableBalance: number;
  lockedBalance: number;
  pendingBalance: number;
  totalCredited: number;
  totalWithdrawn: number;
  bankDetails?: IWalletBankDetails;
  createdAt: Date;
  updatedAt: Date;
}

const WalletBankDetailsSchema = new Schema<IWalletBankDetails>(
  {
    bankCode: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    accountName: { type: String, required: true, trim: true },
    accountNumberLast4: { type: String, required: true, trim: true },
    accountNumber: { type: String, trim: true, select: false },
    paystackRecipientCode: { type: String, trim: true },
  },
  { _id: false }
);

const WalletSchema = new Schema<IWallet>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    profileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      unique: true,
      index: true,
    },
    ownerType: {
      type: String,
      enum: ["tenant", "student", "landlord", "estate_manager", "platform"],
      required: true,
    },
    currency: { type: String, default: "NGN", trim: true },
    availableBalance: { type: Number, default: 0, min: 0 },
    lockedBalance: { type: Number, default: 0, min: 0 },
    pendingBalance: { type: Number, default: 0, min: 0 },
    totalCredited: { type: Number, default: 0, min: 0 },
    totalWithdrawn: { type: Number, default: 0, min: 0 },
    bankDetails: { type: WalletBankDetailsSchema },
  },
  { timestamps: true }
);

export const Wallet = models.Wallet || model<IWallet>("Wallet", WalletSchema);
