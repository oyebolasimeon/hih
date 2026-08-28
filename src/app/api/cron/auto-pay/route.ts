import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { runDueAutoPayBatch } from "@/lib/auto-pay";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET || "";
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectDB();
  const summary = await runDueAutoPayBatch();
  return NextResponse.json({ ok: true, processed: summary.length, summary });
}

export async function POST(req: Request) {
  return GET(req);
}
