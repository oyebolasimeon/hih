import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { connectDB } from "@/lib/db";

const authTokenSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// TTL index — Mongo removes docs after expiresAt
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

type AuthTokenDoc = InferSchemaType<typeof authTokenSchema>;

export const AuthToken: Model<AuthTokenDoc> =
  mongoose.models.AuthToken ||
  mongoose.model<AuthTokenDoc>("AuthToken", authTokenSchema);

export async function mongoTokenSet(
  key: string,
  value: string,
  ttlSeconds: number
) {
  await connectDB();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  await AuthToken.findOneAndUpdate(
    { key },
    { $set: { value, expiresAt } },
    { upsert: true, new: true }
  );
}

export async function mongoTokenGet(key: string): Promise<string | null> {
  await connectDB();
  const doc = await AuthToken.findOne({ key }).lean();
  if (!doc) return null;
  if (doc.expiresAt.getTime() <= Date.now()) {
    await AuthToken.deleteOne({ key });
    return null;
  }
  return doc.value;
}

export async function mongoTokenDel(key: string) {
  await connectDB();
  await AuthToken.deleteOne({ key });
}
