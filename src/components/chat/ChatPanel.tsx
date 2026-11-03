"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Select from "@/components/ui/Select";
import {
  AI_CHAT_LANGUAGES,
  type AiChatLanguage,
} from "@/lib/chat/languages";

export type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatPanelProps = {
  title: string;
  subtitle: string;
  endpoint: string;
  starterPrompts: string[];
  disclaimer: string;
  emptyHint: string;
  onClose: () => void;
  storageKey?: string;
};

const LANG_OPTIONS = AI_CHAT_LANGUAGES.map((l) => ({
  value: l.value,
  label: `${l.nativeLabel}`,
}));

export default function ChatPanel({
  title,
  subtitle,
  endpoint,
  starterPrompts,
  disclaimer,
  emptyHint,
  onClose,
  storageKey = "hih-ai-lang",
}: ChatPanelProps) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<AiChatLanguage>("en");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (
        saved &&
        AI_CHAT_LANGUAGES.some((l) => l.value === saved)
      ) {
        setLanguage(saved as AiChatLanguage);
      }
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function onLanguageChange(value: string) {
    const next = (AI_CHAT_LANGUAGES.some((l) => l.value === value)
      ? value
      : "en") as AiChatLanguage;
    setLanguage(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      /* ignore */
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError("");
    setBusy(true);
    const userTurn: ChatTurn = {
      id: `u-${Date.now()}`,
      role: "user",
      content: message,
    };
    const history = [...turns, userTurn];
    setTurns(history);
    setInput("");

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          language,
          history: history.slice(0, -1).map((t) => ({
            role: t.role,
            content: t.content,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not get a reply.");
        setBusy(false);
        return;
      }
      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply as string,
        },
      ]);
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="flex h-full max-h-[min(640px,calc(100dvh-6rem))] w-full flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">
            AI
          </p>
          <h2 className="font-display text-base font-semibold truncate">
            {title}
          </h2>
          <p className="text-xs text-muted mt-0.5">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-muted hover:bg-surface-dark hover:text-foreground"
          aria-label="Close chat"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div className="border-b border-border bg-surface/70 px-4 py-2.5">
        <Select
          label="Reply language"
          value={language}
          onChange={onLanguageChange}
          options={LANG_OPTIONS}
          className="text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {turns.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">{emptyHint}</p>
            <div className="flex flex-wrap gap-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={busy}
                  onClick={() => void send(prompt)}
                  className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-xs hover:border-brand hover:bg-brand-subtle/50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {turns.map((turn) => (
          <div
            key={turn.id}
            className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                turn.role === "user"
                  ? "bg-brand text-[#0c0d0b] rounded-br-md"
                  : "bg-surface border border-border rounded-bl-md"
              } ${language === "ar" && turn.role === "assistant" ? "text-right" : ""}`}
              dir={
                language === "ar" && turn.role === "assistant" ? "rtl" : "auto"
              }
            >
              {turn.content}
            </div>
          </div>
        ))}

        {busy ? (
          <p className="text-xs text-muted animate-pulse">Thinking…</p>
        ) : null}
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="border-t border-border bg-surface/80 p-3 space-y-2"
      >
        <textarea
          ref={inputRef}
          className="app-input w-full min-h-[72px] resize-none text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about House In Hands…"
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted leading-snug">{disclaimer}</p>
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="app-btn app-btn-primary text-xs shrink-0 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
