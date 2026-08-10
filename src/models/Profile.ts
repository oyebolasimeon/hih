import mongoose, { Schema, models, model } from "mongoose";

export type ProfileType = "student" | "tenant" | "landlord" | "estate_manager";
export type ProfileStatus =
  | "draft"
  | "pending_kyc"
  | "verified"
  | "rejected"
  | "suspended";

export interface IStudentFields {
  institution: string;
  studentIdNumber: string;
}

export interface ILandlordFields {
  bankAccountLast4?: string;
  proofOfAddressUrl?: string;
}

export interface IEstateManagerFields {
  businessName?: string;
  cacNumber?: string;
  businessAddress?: string;
  authorizedRepName?: string;
}

export interface IProfile {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: ProfileType;
  status: ProfileStatus;
  displayName: string;
  phone: string;
  studentFields?: IStudentFields;
  landlordFields?: ILandlordFields;
  estateManagerFields?: IEstateManagerFields;
  /** Masked identifiers after Prembly KYC */
  ninMasked?: string;
  bvnMasked?: string;
  kycVerifiedName?: string;
  latestKycId?: mongoose.Types.ObjectId;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StudentFieldsSchema = new Schema<IStudentFields>(
  {
    institution: { type: String, required: true, trim: true },
    studentIdNumber: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const LandlordFieldsSchema = new Schema<ILandlordFields>(
  {
    bankAccountLast4: { type: String, trim: true },
    proofOfAddressUrl: { type: String, trim: true },
  },
  { _id: false }
);

const EstateManagerFieldsSchema = new Schema<IEstateManagerFields>(
  {
    businessName: { type: String, trim: true },
    cacNumber: { type: String, trim: true },
    businessAddress: { type: String, trim: true },
    authorizedRepName: { type: String, trim: true },
  },
  { _id: false }
);

const ProfileSchema = new Schema<IProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["student", "tenant", "landlord", "estate_manager"],
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "pending_kyc", "verified", "rejected", "suspended"],
      default: "draft",
    },
    displayName: { type: String, required: true, trim: true },
    phone: { type: String, default: "", trim: true },
    studentFields: { type: StudentFieldsSchema },
    landlordFields: { type: LandlordFieldsSchema },
    estateManagerFields: { type: EstateManagerFieldsSchema },
    ninMasked: { type: String, trim: true },
    bvnMasked: { type: String, trim: true },
    kycVerifiedName: { type: String, trim: true },
    latestKycId: { type: Schema.Types.ObjectId, ref: "KycSubmission" },
    verifiedAt: { type: Date },
  },
  { timestamps: true }
);

ProfileSchema.index({ userId: 1, type: 1 }, { unique: true });

export const Profile = models.Profile || model<IProfile>("Profile", ProfileSchema);
