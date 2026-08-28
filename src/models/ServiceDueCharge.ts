import mongoose, { Schema, models, model } from "mongoose";

export type ServiceDueStatus = "pending" | "paid" | "failed";

export interface IServiceDueCharge {
  _id: mongoose.Types.ObjectId;
  propertyServiceId: mongoose.Types.ObjectId;
  leaseId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  tenantProfileId: mongoose.Types.ObjectId;
  landlordProfileId: mongoose.Types.ObjectId;
  serviceName: string;
  amount: number;
  currency: string;
  billingPeriodKey: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate: Date;
  status: ServiceDueStatus;
  paymentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceDueChargeSchema = new Schema<IServiceDueCharge>(
  {
    propertyServiceId: {
      type: Schema.Types.ObjectId,
      ref: "PropertyService",
      required: true,
      index: true,
    },
    leaseId: {
      type: Schema.Types.ObjectId,
      ref: "Lease",
      required: true,
      index: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    tenantProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    landlordProfileId: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
      index: true,
    },
    serviceName: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "NGN", trim: true },
    billingPeriodKey: { type: String, required: true, trim: true, index: true },
    billingPeriodStart: { type: Date, required: true },
    billingPeriodEnd: { type: Date, required: true },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
    paymentId: { type: Schema.Types.ObjectId, ref: "Payment" },
  },
  { timestamps: true }
);

ServiceDueChargeSchema.index(
  { propertyServiceId: 1, leaseId: 1, billingPeriodKey: 1 },
  { unique: true }
);

export const ServiceDueCharge =
  models.ServiceDueCharge ||
  model<IServiceDueCharge>("ServiceDueCharge", ServiceDueChargeSchema);
