import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { getVapidPublicKey } from "@/lib/push";
import { PushSubscription } from "@/models/PushSubscription";

export async function GET() {
  const { response } = await assertUser();
  if (response) return response;
  return NextResponse.json({
    publicKey: getVapidPublicKey(),
    enabled: Boolean(getVapidPublicKey()),
  });
}

const subSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  if (!getVapidPublicKey()) {
    return NextResponse.json(
      { error: "Push notifications are not configured." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = subSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription." }, { status: 400 });
  }

  await connectDB();
  await PushSubscription.findOneAndUpdate(
    { endpoint: parsed.data.endpoint },
    {
      userId: user.id,
      endpoint: parsed.data.endpoint,
      keys: parsed.data.keys,
      userAgent: req.headers.get("user-agent") || "",
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const endpoint = typeof body?.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }

  await connectDB();
  await PushSubscription.deleteOne({ userId: user.id, endpoint });
  return NextResponse.json({ ok: true });
}
