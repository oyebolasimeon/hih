import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Conversation } from "@/models/Conversation";
import { Message } from "@/models/Message";

type Ctx = { params: Promise<{ conversationId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { conversationId } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });
  }

  await connectDB();
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participantUserIds: user.id,
  }).lean();
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 }
    );
  }

  const rows = await Message.find({ conversationId })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();

  return NextResponse.json({
    conversation: {
      id: String(conversation._id),
      participantUserIds: conversation.participantUserIds.map(String),
      listingId: conversation.listingId
        ? String(conversation.listingId)
        : null,
      lastMessageAt: conversation.lastMessageAt || null,
      lastPreview: conversation.lastPreview || "",
    },
    messages: rows.map((m) => ({
      id: String(m._id),
      conversationId: String(m.conversationId),
      fromUserId: String(m.fromUserId),
      toUserId: String(m.toUserId),
      listingId: m.listingId ? String(m.listingId) : null,
      body: m.body,
      read: m.read,
      createdAt: m.createdAt,
    })),
  });
}

const patchSchema = z.object({
  markRead: z.literal(true),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { conversationId } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload." },
      { status: 400 }
    );
  }

  await connectDB();
  const conversation = await Conversation.findOne({
    _id: conversationId,
    participantUserIds: user.id,
  }).lean();
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 }
    );
  }

  const result = await Message.updateMany(
    { conversationId, toUserId: user.id, read: false },
    { $set: { read: true } }
  );

  return NextResponse.json({ marked: result.modifiedCount });
}
