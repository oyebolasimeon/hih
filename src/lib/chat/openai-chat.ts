export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
};

export type ChatToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
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

type CompletionRaw = {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason?: string;
  }[];
};

async function callOpenAi(body: Record<string, unknown>) {
  const key = openaiKey();
  if (!key) {
    return {
      ok: false as const,
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
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return {
        ok: false as const,
        error: `AI provider error (${res.status}). Please try again shortly.`,
      };
    }
    const data = (await res.json()) as CompletionRaw;
    return { ok: true as const, data };
  } catch {
    return {
      ok: false as const,
      error: "Could not reach the AI service. Please try again.",
    };
  }
}

export async function completeChat(input: {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const result = await callOpenAi({
    model: openaiModel(),
    temperature: input.temperature ?? 0.4,
    max_tokens: input.maxTokens ?? 900,
    messages: input.messages,
  });
  if (!result.ok) return result;
  const text = result.data.choices?.[0]?.message?.content?.trim() || "";
  if (!text) {
    return { ok: false, error: "Empty AI response. Please try again." };
  }
  return { ok: true, text };
}

/**
 * Chat with optional tools. Runs up to `maxToolRounds` tool-call loops.
 * Only tools you pass (and execute via `runTool`) can be used.
 */
export async function completeChatWithTools(input: {
  messages: ChatMessage[];
  tools: ChatToolDefinition[];
  runTool: (name: string, argsJson: string) => Promise<string>;
  temperature?: number;
  maxTokens?: number;
  maxToolRounds?: number;
}): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  const messages: ChatMessage[] = [...input.messages];
  const maxRounds = input.maxToolRounds ?? 3;

  for (let round = 0; round < maxRounds; round += 1) {
    const result = await callOpenAi({
      model: openaiModel(),
      temperature: input.temperature ?? 0.35,
      max_tokens: input.maxTokens ?? 1100,
      messages,
      tools: input.tools,
      tool_choice: "auto",
    });
    if (!result.ok) return result;

    const msg = result.data.choices?.[0]?.message;
    const toolCalls = msg?.tool_calls || [];

    if (!toolCalls.length) {
      const text = msg?.content?.trim() || "";
      if (!text) {
        return { ok: false, error: "Empty AI response. Please try again." };
      }
      return { ok: true, text };
    }

    messages.push({
      role: "assistant",
      content: msg?.content || null,
      tool_calls: toolCalls,
    });

    for (const call of toolCalls) {
      const output = await input.runTool(
        call.function.name,
        call.function.arguments || "{}"
      );
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: output,
      });
    }
  }

  // Final pass without tools to force an answer
  const final = await callOpenAi({
    model: openaiModel(),
    temperature: input.temperature ?? 0.35,
    max_tokens: input.maxTokens ?? 1100,
    messages,
  });
  if (!final.ok) return final;
  const text = final.data.choices?.[0]?.message?.content?.trim() || "";
  if (!text) {
    return { ok: false, error: "Empty AI response after tools." };
  }
  return { ok: true, text };
}
