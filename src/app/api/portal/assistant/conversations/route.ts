import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { serializeConversation } from "@/lib/chat/assistant-history";
import { AssistantConversation } from "@/models/AssistantConversation";

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const rows = await AssistantConversation.find({ userId: user.id })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    conversations: rows.map(serializeConversation),
  });
}
