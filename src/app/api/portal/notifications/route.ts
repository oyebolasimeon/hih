import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Notification } from "@/models/Notification";

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const rows = await Notification.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({
    notifications: rows.map((n) => ({
      id: String(n._id),
      type: n.type,
      title: n.title,
      body: n.body,
      link: n.link || null,
      read: n.read,
      meta: n.meta || null,
      createdAt: n.createdAt,
    })),
    unreadCount: rows.filter((n) => !n.read).length,
  });
}

const patchSchema = z
  .object({
    ids: z.array(z.string().min(1)).optional(),
    all: z.boolean().optional(),
  })
  .refine((d) => d.all === true || (d.ids && d.ids.length > 0), {
    message: "Provide ids or all: true",
  });

export async function PATCH(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload." },
      { status: 400 }
    );
  }

  await connectDB();
  const filter: Record<string, unknown> = { userId: user.id, read: false };
  if (!parsed.data.all) {
    filter._id = { $in: parsed.data.ids };
  }

  const result = await Notification.updateMany(filter, { $set: { read: true } });

  return NextResponse.json({
    marked: result.modifiedCount,
  });
}
