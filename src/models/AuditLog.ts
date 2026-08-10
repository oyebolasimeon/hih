import mongoose, { Schema, models, model } from "mongoose";

export type AuditActorKind =
  | "user"
  | "investor"
  | "admin"
  | "system"
  | "anonymous";

export type AuditChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export interface IAuditLog {
  _id: mongoose.Types.ObjectId;
  action: string;
  summary: string;
  actorId?: mongoose.Types.ObjectId | null;
  actorEmail?: string;
  actorName?: string;
  actorKind: AuditActorKind;
  entityType?: string;
  entityId?: string;
  /** Investor whose data this affects — used for portal visibility */
  investorId?: mongoose.Types.ObjectId | null;
  /** Show this event on the investor activity feed */
  investorVisible: boolean;
  changes: AuditChange[];
  metadata?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  requestPath?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AuditChangeSchema = new Schema<AuditChange>(
  {
    field: { type: String, required: true },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    summary: { type: String, required: true },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorEmail: { type: String, default: "", lowercase: true, trim: true },
    actorName: { type: String, default: "" },
    actorKind: {
      type: String,
      enum: ["user", "investor", "admin", "system", "anonymous"],
      default: "anonymous",
      index: true,
    },
    entityType: { type: String, default: "", index: true },
    entityId: { type: String, default: "", index: true },
    investorId: {
      type: Schema.Types.ObjectId,
      ref: "Investor",
      default: null,
      index: true,
    },
    investorVisible: { type: Boolean, default: false, index: true },
    changes: { type: [AuditChangeSchema], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    requestPath: { type: String, default: "" },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ investorId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

export const AuditLog =
  models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);
