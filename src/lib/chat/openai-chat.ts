export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function openaiKey() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.CHAT_AI_API_KEY ||
    ""
  ).trim();
}

function openaiModel() {
  return (
    process.env.CHAT_AI_MODEL ||
    process.env.OPENAI_TEXT_MODEL ||
    "gpt-4o-mini"
  );
}

export function isChatAiConfigured() {
  return Boolean(openaiKey());
}

export async function completeChat(input: {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const key = openaiKey();
  if (!key) {
    return {
      ok: false,
      error:
        "AI chat is not configured yet. Add OPENAI_API_KEY to enable House In Hands assistants.",
    };
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openaiModel(),
        temperature: input.temperature ?? 0.4,
        max_tokens: input.maxTokens ?? 900,
        messages: input.messages,
      }),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `AI provider error (${res.status}). Please try again shortly.`,
      };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim() || "";
    if (!text) {
      return { ok: false, error: "Empty AI response. Please try again." };
    }
    return { ok: true, text };
  } catch {
    return {
      ok: false,
      error: "Could not reach the AI service. Please try again.",
    };
  }
}
