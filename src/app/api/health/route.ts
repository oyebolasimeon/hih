import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { probeTokenStore } from "@/lib/token-store";
import { smtpTransportMode, verifySmtp } from "@/lib/smtp";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

async function probeMongo() {
  try {
    await connectDB();
    const state = (await import("mongoose")).default.connection.readyState;
    return { ok: state === 1, readyState: state };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function probeRedis() {
  if (!process.env.REDIS_HOST && !process.env.REDIS_URL) {
    return { ok: false, configured: false, error: "not configured" };
  }
  try {
    const redis = getRedis();
    const pong = await redis.ping();
    return { ok: pong === "PONG", configured: true };
  } catch (err) {
    return {
      ok: false,
      configured: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const checkSmtp = url.searchParams.get("smtp") === "1";

  const [mongo, redis, tokenStore] = await Promise.all([
    probeMongo(),
    probeRedis(),
    probeTokenStore(),
  ]);

  const body: Record<string, unknown> = {
    ok: mongo.ok && tokenStore.ok,
    mongo,
    redis,
    tokenStore,
    smtpTransport: smtpTransportMode(),
  };

  if (checkSmtp) {
    body.smtp = await verifySmtp();
  }

  const status = mongo.ok && tokenStore.ok ? 200 : 503;
  return NextResponse.json(body, { status });
}
