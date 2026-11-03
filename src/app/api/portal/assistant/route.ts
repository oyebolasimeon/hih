import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { completeChat } from "@/lib/chat/openai-chat";
import {
  AI_CHAT_LANGUAGE_VALUES,
  languageInstruction,
  type AiChatLanguage,
} from "@/lib/chat/languages";
import {
  PORTAL_ASSISTANT_SYSTEM,
  buildPortalAssistantContext,
  findReceiptHint,
} from "@/lib/chat/portal-context";

const langEnum = z.enum(
  AI_CHAT_LANGUAGE_VALUES as unknown as [AiChatLanguage, ...AiChatLanguage[]]
);

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  language: langEnum.optional().default("en"),
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

  const { message, history, language } = parsed.data;
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
      ...history.map((h) => ({
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
  // Keep disclaimer in English for clarity even when reply language differs,
  // unless the model already included a local equivalent containing the English phrase.
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

  return NextResponse.json({
    reply,
    disclaimer:
      "House In Hands AI Assistant is not a lawyer and does not provide legal advice.",
  });
}
