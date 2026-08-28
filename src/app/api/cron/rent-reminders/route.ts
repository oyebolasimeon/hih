import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { runRentReminderBatch } from "@/lib/rent-defaulters";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET || "";
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectDB();
  const summary = await runRentReminderBatch();
  return NextResponse.json({ ok: true, summary });
}

export async function POST(req: Request) {
  return GET(req);
}
