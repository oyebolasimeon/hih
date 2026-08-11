/**
 * Short-lived auth tokens (email verify, password reset, auto-login).
 * Redis first; Mongo fallback when Redis is blocked/unreachable (typical on cPanel).
 */

import { redisDel, redisGet, redisSet } from "@/lib/redis";
import {
  mongoTokenDel,
  mongoTokenGet,
  mongoTokenSet,
} from "@/models/AuthToken";

async function redisAvailable(): Promise<boolean> {
  return Boolean(process.env.REDIS_HOST || process.env.REDIS_URL);
}

export async function tokenSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<"redis" | "mongo"> {
  if (await redisAvailable()) {
    try {
      await redisSet(key, value, ttlSeconds);
      return "redis";
    } catch (err) {
      console.warn(
        "tokenSet Redis failed, using Mongo:",
        err instanceof Error ? err.message : err
      );
    }
  }
  await mongoTokenSet(key, value, ttlSeconds);
  return "mongo";
}

export async function tokenGet(key: string): Promise<string | null> {
  if (await redisAvailable()) {
    try {
      const v = await redisGet(key);
      if (v != null) return v;
    } catch (err) {
      console.warn(
        "tokenGet Redis failed, trying Mongo:",
        err instanceof Error ? err.message : err
      );
    }
  }
  try {
    return await mongoTokenGet(key);
  } catch (err) {
    console.warn(
      "tokenGet Mongo failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

export async function tokenDel(key: string): Promise<void> {
  if (await redisAvailable()) {
    try {
      await redisDel(key);
    } catch {
      /* ignore */
    }
  }
  try {
    await mongoTokenDel(key);
  } catch {
    /* ignore */
  }
}

export async function probeTokenStore(): Promise<{
  ok: boolean;
  backend: "redis" | "mongo" | "none";
  error?: string;
}> {
  const probeKey = `__health:token:${Date.now()}`;
  try {
    const backend = await tokenSet(probeKey, "1", 30);
    const got = await tokenGet(probeKey);
    await tokenDel(probeKey);
    if (got !== "1") {
      return { ok: false, backend, error: "readback mismatch" };
    }
    return { ok: true, backend };
  } catch (err) {
    return {
      ok: false,
      backend: "none",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
