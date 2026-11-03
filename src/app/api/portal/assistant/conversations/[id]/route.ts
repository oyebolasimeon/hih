import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import {
  getOwnedConversation,
  serializeConversation,
  serializeMessage,
  titleFromMessage,
} from "@/lib/chat/assistant-history";
import { AssistantMessage } from "@/models/AssistantMessage";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await params;
  await connectDB();

  const conversation = await getOwnedConversation(id, user.id);
  if (!conversation) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  const messages = await AssistantMessage.find({ conversationId: id })
    .sort({ createdAt: 1 })
    .limit(200)
    .lean();

  return NextResponse.json({
    conversation: serializeConversation(conversation),
    messages: messages.map(serializeMessage),
  });
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
});

export async function PATCH(req: Request, { params }: Params) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 }
    );
  }

  await connectDB();
  const conversation = await getOwnedConversation(id, user.id);
  if (!conversation) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  if (parsed.data.title) {
    conversation.title = titleFromMessage(parsed.data.title);
    await conversation.save();
  }

  return NextResponse.json({
    conversation: serializeConversation(conversation),
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await params;
  await connectDB();

  const conversation = await getOwnedConversation(id, user.id);
  if (!conversation) {
    return NextResponse.json({ error: "Chat not found." }, { status: 404 });
  }

  await AssistantMessage.deleteMany({ conversationId: id, userId: user.id });
  await conversation.deleteOne();

  return NextResponse.json({ ok: true });
}
