import { NextResponse } from "next/server";
import { z } from "zod";
import { completeChatWithTools } from "@/lib/chat/openai-chat";
import {
  AI_CHAT_LANGUAGE_VALUES,
  languageInstruction,
  type AiChatLanguage,
} from "@/lib/chat/languages";
import {
  PUBLIC_CHAT_SYSTEM,
  buildPublicChatContext,
} from "@/lib/chat/public-context";
import {
  SEARCH_LISTINGS_TOOL,
  runPublicChatTool,
  searchPublicListings,
} from "@/lib/chat/listing-search-tool";

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
    .max(12)
    .optional()
    .default([]),
});

function looksLikeListingQuery(message: string) {
  return /(listing|rent|apartment|house|hostel|home|property|properties|flat|duplex|self[-\s]?contain|lagos|abuja|ikeja|lekki|available)/i.test(
    message
  );
}

function inferListingArgs(message: string) {
  const lower = message.toLowerCase();
  const args: {
    city?: string;
    state?: string;
    listingType?: string;
    query?: string;
    limit?: number;
  } = { limit: 8, query: message };

  if (/\blagos\b/.test(lower)) {
    args.state = "Lagos";
    args.city = "Lagos";
  } else if (/\babuja\b|\bfct\b/.test(lower)) {
    args.state = "FCT";
    args.city = "Abuja";
  } else if (/\bikeja\b/.test(lower)) {
    args.city = "Ikeja";
    args.state = "Lagos";
  } else if (/\blekki\b/.test(lower)) {
    args.city = "Lekki";
    args.state = "Lagos";
  }

  if (/\bhostel\b/.test(lower)) args.listingType = "hostel";
  else if (/\bapartment\b|\bflat\b/.test(lower)) args.listingType = "apartment";
  else if (/\bhouse\b|\bduplex\b/.test(lower)) args.listingType = "house";

  return args;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid message." },
      { status: 400 }
    );
  }

  const { message, history, language } = parsed.data;
  const context = await buildPublicChatContext(message);

  // Prefetch listings for property questions so answers never "refuse" empty context
  let listingPrefetch = "";
  if (looksLikeListingQuery(message)) {
    const pre = await searchPublicListings(inferListingArgs(message));
    listingPrefetch = `\n\nPREFETCHED_LISTINGS (from database tool search_listings):\n${JSON.stringify(pre)}`;
  }

  const result = await completeChatWithTools({
    messages: [
      { role: "system", content: PUBLIC_CHAT_SYSTEM },
      {
        role: "system",
        content: `LANGUAGE:\n${languageInstruction(language)}`,
      },
      {
        role: "system",
        content: `CONTEXT:\n${context || "No FAQ context."}${listingPrefetch}`,
      },
      ...history.map((h) => ({
        role: h.role as "user" | "assistant",
        content: h.content,
      })),
      { role: "user", content: message },
    ],
    tools: [SEARCH_LISTINGS_TOOL],
    runTool: runPublicChatTool,
    temperature: 0.3,
    maxTokens: 1200,
    maxToolRounds: 2,
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
