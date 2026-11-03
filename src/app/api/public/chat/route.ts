import { NextResponse } from "next/server";
import { z } from "zod";
import { completeChat } from "@/lib/chat/openai-chat";
import {
  PUBLIC_CHAT_SYSTEM,
  buildPublicChatContext,
} from "@/lib/chat/public-context";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      })
    )
    .max(12)
    .optional()
    .default([]),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid message." },
      { status: 400 }
    );
  }

  const { message, history } = parsed.data;
  const context = await buildPublicChatContext(message);

  const result = await completeChat({
    messages: [
      { role: "system", content: PUBLIC_CHAT_SYSTEM },
      {
        role: "system",
        content: `CONTEXT:\n${context || "No extra context available."}`,
      },
      ...history.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ],
    temperature: 0.35,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({
    reply: result.text,
    disclaimer:
      "House In Hands AI can make mistakes. This is not legal advice.",
  });
}
