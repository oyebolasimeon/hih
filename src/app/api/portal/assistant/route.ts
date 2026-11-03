import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { completeChat } from "@/lib/chat/openai-chat";
import {
  AI_CHAT_LANGUAGE_VALUES,
  languageInstruction,
  type AiChatLanguage,
} from "@/lib/chat/languages";
import {
  appendAssistantTurn,
  ensureAssistantConversation,
  loadConversationHistory,
  serializeConversation,
  serializeMessage,
} from "@/lib/chat/assistant-history";
import {
  PORTAL_ASSISTANT_SYSTEM,
  buildPortalAssistantContext,
  findReceiptHint,
} from "@/lib/chat/portal-context";
import { AssistantConversation } from "@/models/AssistantConversation";

const langEnum = z.enum(
  AI_CHAT_LANGUAGE_VALUES as unknown as [AiChatLanguage, ...AiChatLanguage[]]
);

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  language: langEnum.optional().default("en"),
  conversationId: z.string().trim().min(1).max(64).optional().nullable(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      })
    )
    .max(16)
    .optional()
    .default([]),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid message." },
      { status: 400 }
    );
  }

  const { message, history, language, conversationId } = parsed.data;

  await connectDB();
  const { conversation, created } = await ensureAssistantConversation({
    userId: user.id,
    conversationId,
    language,
    firstMessage: message,
  });

  const storedHistory = await loadConversationHistory(
    String(conversation._id),
    16
  );
  const chatHistory =
    storedHistory.length > 0
      ? storedHistory
      : history.map((h) => ({
          role: h.role as "user" | "assistant",
          content: h.content,
        }));

  const context = await buildPortalAssistantContext(user.id);
  const receiptHint = findReceiptHint(context, message);

  const result = await completeChat({
    messages: [
      { role: "system", content: PORTAL_ASSISTANT_SYSTEM },
      {
        role: "system",
        content: `LANGUAGE:\n${languageInstruction(language)}`,
      },
      {
        role: "system",
        content: `USER_CONTEXT:\n${context}${
          receiptHint ? `\n\nRECEIPT_HINT:\n${receiptHint}` : ""
        }`,
      },
      ...chatHistory.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ],
    temperature: 0.35,
    maxTokens: 1100,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  let reply = result.text;
  if (!/not legal advice/i.test(reply)) {
    const disclaimers: Record<AiChatLanguage, string> = {
      en: "\n\n_Note: This is not legal advice. For legal matters, consult a qualified lawyer._",
      yo: "\n\n_Àkíyèsí: Èyí kì í ṣe ìmọ̀ràn òfin. Fún ọ̀ràn òfin, kàn sí agbẹjọ́rò tó ní ìmọ̀._",
      ha: "\n\n_Lura: Wannan ba shawarar shari'a ba ne. Domin al'amuran shari'a, tuntubi lauya._",
      pcm: "\n\n_Note: Dis one no be legal advice. For legal matter, see proper lawyer._",
      ar: "\n\n_ملاحظة: هذا ليس استشارة قانونية. للمسائل القانونية راجع محامياً مؤهلاً._",
      ig: "\n\n_Nkwupụta: Nke a abụghị ndụmọdụ iwu. Maka ihe gbasara iwu, gwa onye ọka iwu._",
    };
    reply += disclaimers[language] || disclaimers.en;
  }

  const { userMsg, assistantMsg } = await appendAssistantTurn({
    conversationId: conversation._id,
    userId: user.id,
    userContent: message,
    assistantContent: reply,
    language,
  });

  const fresh = await AssistantConversation.findById(conversation._id);
  const convDoc = fresh || conversation;

  return NextResponse.json({
    reply,
    conversationId: String(conversation._id),
    conversation: serializeConversation(convDoc),
    messages: [serializeMessage(userMsg), serializeMessage(assistantMsg)],
    created,
    disclaimer:
      "House In Hands AI Assistant is not a lawyer and does not provide legal advice.",
  });
}
