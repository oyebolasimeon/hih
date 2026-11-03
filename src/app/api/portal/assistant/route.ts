import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { completeChat } from "@/lib/chat/openai-chat";
import {
  PORTAL_ASSISTANT_SYSTEM,
  buildPortalAssistantContext,
  findReceiptHint,
} from "@/lib/chat/portal-context";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
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

  const { message, history } = parsed.data;
  const context = await buildPortalAssistantContext(user.id);
  const receiptHint = findReceiptHint(context, message);

  const result = await completeChat({
    messages: [
      { role: "system", content: PORTAL_ASSISTANT_SYSTEM },
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
  if (!/not legal advice/i.test(reply)) {
    reply +=
      "\n\n_Note: This is not legal advice. For legal matters, consult a qualified lawyer._";
  }

  return NextResponse.json({
    reply,
    disclaimer:
      "House In Hands AI Assistant is not a lawyer and does not provide legal advice.",
  });
}
