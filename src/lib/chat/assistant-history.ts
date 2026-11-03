import mongoose from "mongoose";
import { AssistantConversation } from "@/models/AssistantConversation";
import { AssistantMessage } from "@/models/AssistantMessage";
import type { AiChatLanguage } from "@/lib/chat/languages";

export function titleFromMessage(message: string) {
  const cleaned = message.replace(/\s+/g, " ").trim();
  if (!cleaned) return "New chat";
  return cleaned.length > 56 ? `${cleaned.slice(0, 53)}…` : cleaned;
}

export function serializeConversation(doc: {
  _id: mongoose.Types.ObjectId;
  title: string;
  language: string;
  lastMessageAt?: Date | null;
  lastPreview?: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: String(doc._id),
    title: doc.title,
    language: doc.language,
    lastMessageAt: doc.lastMessageAt
      ? new Date(doc.lastMessageAt).toISOString()
      : null,
    lastPreview: doc.lastPreview || "",
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export function serializeMessage(doc: {
  _id: mongoose.Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}) {
  return {
    id: String(doc._id),
    role: doc.role,
    content: doc.content,
    createdAt: new Date(doc.createdAt).toISOString(),
  };
}

export async function getOwnedConversation(
  conversationId: string,
  userId: string
) {
  if (!mongoose.isValidObjectId(conversationId)) return null;
  return AssistantConversation.findOne({
    _id: conversationId,
    userId,
  });
}

export async function loadConversationHistory(
  conversationId: string,
  limit = 24
) {
  const rows = await AssistantMessage.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  return rows.reverse().map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}

export async function ensureAssistantConversation(opts: {
  userId: string;
  conversationId?: string | null;
  language: AiChatLanguage;
  firstMessage: string;
}) {
  const { userId, conversationId, language, firstMessage } = opts;

  if (conversationId) {
    const existing = await getOwnedConversation(conversationId, userId);
    if (existing) {
      if (existing.language !== language) {
        existing.language = language;
        await existing.save();
      }
      return { conversation: existing, created: false };
    }
  }

  const conversation = await AssistantConversation.create({
    userId,
    title: titleFromMessage(firstMessage),
    language,
    lastMessageAt: new Date(),
    lastPreview: firstMessage.slice(0, 280),
  });

  return { conversation, created: true };
}

export async function appendAssistantTurn(opts: {
  conversationId: mongoose.Types.ObjectId | string;
  userId: string;
  userContent: string;
  assistantContent: string;
  language: AiChatLanguage;
}) {
  const { conversationId, userId, userContent, assistantContent, language } =
    opts;
  const now = new Date();

  const [userMsg, assistantMsg] = await AssistantMessage.create([
    {
      conversationId,
      userId,
      role: "user",
      content: userContent,
      createdAt: now,
    },
    {
      conversationId,
      userId,
      role: "assistant",
      content: assistantContent,
      createdAt: new Date(now.getTime() + 1),
    },
  ]);

  await AssistantConversation.updateOne(
    { _id: conversationId, userId },
    {
      $set: {
        language,
        lastMessageAt: new Date(),
        lastPreview: assistantContent.slice(0, 280),
      },
    }
  );

  return { userMsg, assistantMsg };
}
