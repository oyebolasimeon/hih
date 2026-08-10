"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

type Conversation = {
  id: string;
  lastPreview: string;
  lastMessageAt: string | null;
  unreadCount: number;
  listingTitle: string | null;
  otherUser: { id: string; name: string; email: string } | null;
};

type MessageRow = {
  id: string;
  fromUserId: string;
  toUserId: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export default function MessagesClient() {
  const { data: session } = useSession();
  const meId = session?.user?.id || "";
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [toUserId, setToUserId] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/messages");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load messages.");
      return;
    }
    setConversations(data.conversations || []);
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const openThread = useCallback(async (id: string) => {
    setActiveId(id);
    setThreadLoading(true);
    setError("");
    const res = await fetch(`/api/portal/messages/${id}`);
    const data = await res.json();
    setThreadLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load thread.");
      return;
    }
    setMessages(data.messages || []);
    await fetch(`/api/portal/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markRead: true }),
    });
    await loadConversations();
  }, [loadConversations]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    const active = conversations.find((c) => c.id === activeId);
    const payload = activeId
      ? {
          conversationId: activeId,
          toUserId: active?.otherUser?.id || toUserId,
          body,
        }
      : { toUserId, body };

    if (!payload.toUserId || !body.trim()) {
      setError("Recipient and message body are required.");
      setSending(false);
      return;
    }

    const res = await fetch("/api/portal/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || "Could not send message.");
      return;
    }
    setBody("");
    setToUserId("");
    await loadConversations();
    const cid = data.conversation?.id || activeId;
    if (cid) await openThread(cid);
  }

  if (loading) return <TableSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Conversations</h2>
          {conversations.length === 0 ? (
            <EmptyState
              title="No conversations"
              description="Start a chat by sending a message to another user’s ID."
            />
          ) : (
            <ul className="space-y-2">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => void openThread(c.id)}
                    className={`w-full text-left app-card p-3 ${
                      activeId === c.id ? "border-brand/50" : ""
                    }`}
                  >
                    <p className="font-medium text-sm truncate">
                      {c.otherUser?.name || "User"}
                      {c.unreadCount > 0 ? (
                        <span className="ml-2 text-xs text-brand">
                          {c.unreadCount}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted truncate mt-0.5">
                      {c.listingTitle ? `${c.listingTitle} · ` : ""}
                      {c.lastPreview || "No messages"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="app-card p-4 sm:p-5 space-y-4 min-h-[320px]">
          {activeId ? (
            <>
              {threadLoading ? (
                <p className="text-sm text-muted">Loading thread…</p>
              ) : (
                <ul className="space-y-3 max-h-80 overflow-y-auto">
                  {messages.map((m) => {
                    const mine = meId
                      ? m.fromUserId === meId
                      : conversations.find((c) => c.id === activeId)?.otherUser
                          ?.id === m.toUserId;
                    return (
                      <li
                        key={m.id}
                        className={`text-sm rounded-md px-3 py-2 max-w-[85%] ${
                          mine
                            ? "ml-auto bg-brand-subtle"
                            : "bg-surface-dark"
                        }`}
                      >
                        <p>{m.body}</p>
                        <p className="text-[10px] text-muted mt-1">
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">
              Select a conversation or start a new one below.
            </p>
          )}

          <form onSubmit={onSend} className="space-y-3 border-t border-border pt-4">
            {!activeId ? (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  To user ID
                </label>
                <input
                  className="app-input w-full"
                  value={toUserId}
                  onChange={(e) => setToUserId(e.target.value)}
                  placeholder="Recipient user ObjectId"
                />
              </div>
            ) : null}
            <div>
              <label className="block text-sm font-medium mb-1.5">Message</label>
              <textarea
                className="app-input w-full min-h-[80px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={sending}
              className="app-btn app-btn-primary text-sm"
            >
              {sending ? "Sending…" : "Send"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
