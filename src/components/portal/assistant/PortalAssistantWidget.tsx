"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Select from "@/components/ui/Select";
import {
  AI_CHAT_LANGUAGES,
  type AiChatLanguage,
} from "@/lib/chat/languages";

type ChatTurn = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ConversationRow = {
  id: string;
  title: string;
  language: string;
  lastMessageAt: string | null;
  lastPreview: string;
};

const LANG_OPTIONS = AI_CHAT_LANGUAGES.map((l) => ({
  value: l.value,
  label: l.nativeLabel,
}));

const STARTERS = [
  "What rent do I owe right now?",
  "Find my latest rent receipt",
  "Forecast my property spending next month",
  "What should I do on my open building issues?",
  "Remind me what to check before exiting a lease",
];

const STORAGE_KEY = "hih-portal-ai-lang";

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function PortalAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState<AiChatLanguage>("en");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && AI_CHAT_LANGUAGES.some((l) => l.value === saved)) {
        setLanguage(saved as AiChatLanguage);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await fetch("/api/portal/assistant/conversations");
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
      }
    } catch {
      /* ignore list errors in widget */
    }
    setLoadingList(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadConversations();
    inputRef.current?.focus();
  }, [open, loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  function onLanguageChange(value: string) {
    const next = (AI_CHAT_LANGUAGES.some((l) => l.value === value)
      ? value
      : "en") as AiChatLanguage;
    setLanguage(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  function startNewChat() {
    setConversationId(null);
    setTurns([]);
    setError("");
    setInput("");
    setHistoryOpen(false);
    inputRef.current?.focus();
  }

  async function openConversation(id: string) {
    if (busy) return;
    setLoadingThread(true);
    setError("");
    setConversationId(id);
    setHistoryOpen(false);
    try {
      const res = await fetch(`/api/portal/assistant/conversations/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not load chat.");
        setLoadingThread(false);
        return;
      }
      const msgs = (data.messages || []) as Array<{
        id: string;
        role: "user" | "assistant";
        content: string;
      }>;
      setTurns(
        msgs.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      );
      const lang = data.conversation?.language;
      if (lang && AI_CHAT_LANGUAGES.some((l) => l.value === lang)) {
        setLanguage(lang as AiChatLanguage);
      }
    } catch {
      setError("Network error loading chat.");
    }
    setLoadingThread(false);
  }

  async function deleteConversation(id: string) {
    if (busy) return;
    const res = await fetch(`/api/portal/assistant/conversations/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (conversationId === id) {
      startNewChat();
    }
  }

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setError("");
    setBusy(true);
    const tempUserId = `u-${Date.now()}`;
    const userTurn: ChatTurn = {
      id: tempUserId,
      role: "user",
      content: message,
    };
    const history = [...turns, userTurn];
    setTurns(history);
    setInput("");

    try {
      const res = await fetch("/api/portal/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          language,
          conversationId,
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

      const nextId = (data.conversationId as string) || conversationId;
      if (nextId) setConversationId(nextId);

      const saved = (data.messages || []) as Array<{
        id: string;
        role: "user" | "assistant";
        content: string;
      }>;
      if (saved.length >= 2) {
        setTurns((prev) => {
          const withoutTemp = prev.filter((t) => t.id !== tempUserId);
          return [
            ...withoutTemp,
            ...saved.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            })),
          ];
        });
      } else {
        setTurns((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.reply as string,
          },
        ]);
      }

      if (data.conversation) {
        const row = data.conversation as ConversationRow;
        setConversations((prev) => {
          const rest = prev.filter((c) => c.id !== row.id);
          return [row, ...rest];
        });
      } else {
        void loadConversations();
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  const activeTitle =
    conversations.find((c) => c.id === conversationId)?.title || "New chat";

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="flex h-[min(78vh,42rem)] w-[min(100vw-1.5rem,44rem)] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
          {/* History sidebar */}
          <aside
            className={`${
              historyOpen ? "flex" : "hidden"
            } w-full flex-col border-r border-border bg-surface sm:flex sm:w-[13.5rem] sm:shrink-0`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">
                Chats
              </p>
              <button
                type="button"
                onClick={startNewChat}
                className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-[#0c0d0b] hover:brightness-105"
              >
                New chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {loadingList && conversations.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted">Loading…</p>
              ) : null}
              {!loadingList && conversations.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted">
                  Your chats will appear here.
                </p>
              ) : null}
              {conversations.map((c) => {
                const active = c.id === conversationId;
                return (
                  <div
                    key={c.id}
                    className={`group flex items-start gap-1 rounded-lg ${
                      active ? "bg-brand-subtle" : "hover:bg-surface-dark/70"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => void openConversation(c.id)}
                      className="min-w-0 flex-1 px-2.5 py-2 text-left"
                    >
                      <p className="truncate text-xs font-medium text-foreground">
                        {c.title || "Chat"}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-muted">
                        {formatWhen(c.lastMessageAt)}
                        {c.lastPreview
                          ? ` · ${c.lastPreview.slice(0, 40)}`
                          : ""}
                      </p>
                    </button>
                    <button
                      type="button"
                      title="Delete chat"
                      aria-label="Delete chat"
                      onClick={() => void deleteConversation(c.id)}
                      className="mt-1.5 mr-1 rounded p-1 text-muted opacity-0 group-hover:opacity-100 hover:bg-background hover:text-danger"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M4 7h16M9 7V5h6v2m-8 0l1 12h6l1-12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Main thread */}
          <div
            className={`${
              historyOpen ? "hidden sm:flex" : "flex"
            } min-w-0 flex-1 flex-col`}
          >
            <div className="flex items-start justify-between gap-2 border-b border-border bg-surface px-3 py-3 sm:px-4">
              <div className="min-w-0 flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => setHistoryOpen((v) => !v)}
                  className="mt-0.5 rounded-md p-1.5 text-muted hover:bg-surface-dark hover:text-foreground sm:hidden"
                  aria-label="Toggle chat history"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M4 6h16M4 12h10M4 18h16" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">
                    AI Assistant
                  </p>
                  <h2 className="truncate font-display text-base font-semibold">
                    {activeTitle}
                  </h2>
                  <p className="mt-0.5 text-xs text-muted">
                    Saved to your account · not legal advice
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={startNewChat}
                  className="hidden rounded-md px-2 py-1.5 text-[11px] font-medium text-muted hover:bg-surface-dark hover:text-foreground sm:inline-flex"
                >
                  New
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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
            </div>

            <div className="border-b border-border bg-surface/70 px-3 py-2.5 sm:px-4">
              <Select
                label="Reply language"
                value={language}
                onChange={onLanguageChange}
                options={LANG_OPTIONS}
                className="text-sm"
              />
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
              {loadingThread ? (
                <p className="text-sm text-muted animate-pulse">
                  Loading chat…
                </p>
              ) : null}

              {!loadingThread && turns.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">
                    I can help with your leases, bills, receipts, spending
                    outlook, building issues and next steps — but I don’t give
                    legal advice. Chats are saved so you can come back anytime.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {STARTERS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={busy}
                        onClick={() => void send(prompt)}
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-left text-xs transition-colors hover:border-brand hover:bg-brand-subtle/50"
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
                  className={`flex ${
                    turn.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                      turn.role === "user"
                        ? "rounded-br-md bg-brand text-[#0c0d0b]"
                        : "rounded-bl-md border border-border bg-surface"
                    } ${
                      language === "ar" && turn.role === "assistant"
                        ? "text-right"
                        : ""
                    }`}
                    dir={
                      language === "ar" && turn.role === "assistant"
                        ? "rtl"
                        : "auto"
                    }
                  >
                    {turn.content}
                  </div>
                </div>
              ))}

              {busy ? (
                <p className="animate-pulse text-xs text-muted">Thinking…</p>
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
              className="space-y-2 border-t border-border bg-surface/80 p-3"
            >
              <textarea
                ref={inputRef}
                className="app-input min-h-[72px] w-full resize-none text-sm"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything about your account…"
                disabled={busy || loadingThread}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] leading-snug text-muted">
                  Not legal advice. Confirm important actions in the portal.
                </p>
                <button
                  type="submit"
                  disabled={busy || loadingThread || !input.trim()}
                  className="app-btn app-btn-primary shrink-0 text-xs disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand px-4 py-3 text-sm font-semibold text-[#0c0d0b] shadow-lg transition hover:brightness-105"
        aria-expanded={open}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0c0d0b]/10">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3a1 1 0 00-1 1v1H6a3 3 0 00-3 3v9a3 3 0 003 3h12a3 3 0 003-3V8a3 3 0 00-3-3h-2V4a1 1 0 00-1-1H9zm1 2h4v1h-4V5zm-4 4h12v8a1 1 0 01-1 1H6a1 1 0 01-1-1V9zm3.5 2a1 1 0 100 2h5a1 1 0 100-2h-5zm0 3a1 1 0 100 2h3a1 1 0 100-2h-3z" />
          </svg>
        </span>
        {open ? "Close assistant" : "AI Assistant"}
      </button>
    </div>
  );
}
