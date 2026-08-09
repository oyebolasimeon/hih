import { connectDB } from "@/lib/db";
import { AuditLog, type AuditActorKind, type AuditChange } from "@/models/AuditLog";
import mongoose from "mongoose";

const SENSITIVE_FIELDS = new Set([
  "password",
  "passwordHash",
  "currentPassword",
  "newPassword",
  "token",
  "secret",
]);

export function sanitizeAuditValue(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (value.length > 2000) return `${value.slice(0, 2000)}…`;
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.slice(0, 50).map(sanitizeAuditValue);
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_FIELDS.has(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = sanitizeAuditValue(v);
      }
    }
    return out;
  }
  return String(value);
}

export function diffObjects(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  fields?: string[]
): AuditChange[] {
  const keys =
    fields ||
    Array.from(
      new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {}),
      ])
    );

  const changes: AuditChange[] = [];
  for (const field of keys) {
    if (SENSITIVE_FIELDS.has(field)) {
      const oldHad = before && field in before && before[field] != null;
      const newHad = after && field in after && after[field] != null;
      if (oldHad || newHad) {
        changes.push({
          field,
          oldValue: oldHad ? "[redacted]" : null,
          newValue: newHad ? "[changed]" : null,
        });
      }
      continue;
    }

    const oldValue = before ? before[field] : undefined;
    const newValue = after ? after[field] : undefined;
    const oldS = JSON.stringify(sanitizeAuditValue(oldValue));
    const newS = JSON.stringify(sanitizeAuditValue(newValue));
    if (oldS !== newS) {
      changes.push({
        field,
        oldValue: sanitizeAuditValue(oldValue),
        newValue: sanitizeAuditValue(newValue),
      });
    }
  }
  return changes;
}

export type AuditActor = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  isAdmin?: boolean;
  kind?: AuditActorKind;
};

export type WriteAuditInput = {
  action: string;
  summary: string;
  actor?: AuditActor | null;
  entityType?: string;
  entityId?: string | null;
  investorId?: string | null;
  investorVisible?: boolean;
  changes?: AuditChange[];
  metadata?: Record<string, unknown>;
  request?: Request | null;
};

export function requestMeta(request?: Request | null) {
  if (!request) {
    return { ip: "", userAgent: "", requestPath: "" };
  }
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "";
  const userAgent = request.headers.get("user-agent") || "";
  let requestPath = "";
  try {
    requestPath = new URL(request.url).pathname;
  } catch {
    requestPath = "";
  }
  return { ip, userAgent, requestPath };
}

function toObjectId(id?: string | null) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return new mongoose.Types.ObjectId(id);
}

/**
 * Persist an audit event. Never throws to callers — failures are logged only.
 */
export async function writeAudit(input: WriteAuditInput): Promise<void> {
  try {
    await connectDB();
    const meta = requestMeta(input.request);
    const actorKind: AuditActorKind =
      input.actor?.kind ||
      (input.actor?.isAdmin
        ? "admin"
        : input.actor?.id
          ? "investor"
          : "anonymous");

    await AuditLog.create({
      action: input.action,
      summary: input.summary,
      actorId: toObjectId(input.actor?.id),
      actorEmail: (input.actor?.email || "").toLowerCase(),
      actorName: input.actor?.name || "",
      actorKind,
      entityType: input.entityType || "",
      entityId: input.entityId ? String(input.entityId) : "",
      investorId: toObjectId(input.investorId),
      investorVisible: Boolean(
        input.investorVisible ?? Boolean(input.investorId)
      ),
      changes: (input.changes || []).map((c) => ({
        field: c.field,
        oldValue: sanitizeAuditValue(c.oldValue),
        newValue: sanitizeAuditValue(c.newValue),
      })),
      metadata: sanitizeAuditValue(input.metadata || {}) as Record<
        string,
        unknown
      >,
      ...meta,
    });
  } catch (err) {
    console.error("Audit write failed:", err);
  }
}

export function actorFromUser(
  user:
    | {
        id?: string;
        email?: string | null;
        name?: string | null;
        isAdmin?: boolean;
      }
    | null
    | undefined
): AuditActor | null {
  if (!user?.id) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    isAdmin: Boolean(user.isAdmin),
    kind: user.isAdmin ? "admin" : "investor",
  };
}

export function leanDoc(
  doc: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!doc) return null;
  const { _id, __v, passwordHash, ...rest } = doc;
  return {
    id: _id != null ? String(_id) : undefined,
    ...rest,
  };
}
