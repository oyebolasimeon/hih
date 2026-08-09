import mongoose from "mongoose";
import { formatGBP } from "@/lib/format";

export function toId(doc: { _id: mongoose.Types.ObjectId | string }) {
  return String(doc._id);
}

export function serializeDates<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = { ...obj };
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) out[k] = v.toISOString();
  }
  return out;
}

export { formatGBP };
