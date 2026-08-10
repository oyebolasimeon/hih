/**
 * OTP storage with Redis primary and in-memory fallback.
 * Phone OTP is delivered by email when SMS is not configured.
 */

import { redisDel, redisGet, redisSet } from "@/lib/redis";

const memory = new Map<string, { value: string; expiresAt: number }>();

function memorySet(key: string, value: string, ttlSeconds: number) {
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function memoryGet(key: string): string | null {
  const row = memory.get(key);
  if (!row) return null;
  if (Date.now() > row.expiresAt) {
    memory.delete(key);
    return null;
  }
  return row.value;
}

function memoryDel(key: string) {
  memory.delete(key);
}

export async function otpSet(key: string, value: string, ttlSeconds: number) {
  try {
    await redisSet(key, value, ttlSeconds);
  } catch (err) {
    console.warn("OTP redis set failed, using memory:", err);
    memorySet(key, value, ttlSeconds);
  }
}

export async function otpGet(key: string): Promise<string | null> {
  try {
    const v = await redisGet(key);
    if (v != null) return v;
  } catch (err) {
    console.warn("OTP redis get failed, using memory:", err);
  }
  return memoryGet(key);
}

export async function otpDel(key: string) {
  try {
    await redisDel(key);
  } catch {
    /* ignore */
  }
  memoryDel(key);
}

/** SMS not wired — OTPs go to the account email. Set SMS_* later to switch channel. */
export function phoneOtpDeliveryChannel(): "email" | "sms" {
  if (process.env.SMS_PROVIDER && process.env.SMS_API_KEY) return "sms";
  return "email";
}
