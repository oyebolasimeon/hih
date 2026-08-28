import mongoose, { Schema, models, model } from "mongoose";

export interface IPaymentMethod {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  profileId: mongoose.Types.ObjectId;
  paystackAuthorizationCode: string;
  paystackEmail: string;
  cardType?: string;
  last4?: string;
  expMonth?: string;
  expYear?: string;
  bank?: string;
  isDefault: boolean;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
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
      index: true,
    },
    paystackAuthorizationCode: {
      type: String,
      required: true,
      trim: true,
      select: false,
    },
    paystackEmail: { type: String, required: true, trim: true },
    cardType: { type: String, trim: true },
    last4: { type: String, trim: true },
    expMonth: { type: String, trim: true },
    expYear: { type: String, trim: true },
    bank: { type: String, trim: true },
    isDefault: { type: Boolean, default: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

PaymentMethodSchema.index({ profileId: 1, active: 1 });

export const PaymentMethod =
  models.PaymentMethod ||
  model<IPaymentMethod>("PaymentMethod", PaymentMethodSchema);
