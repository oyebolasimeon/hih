"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { usePortalRealtime } from "@/components/portal/PortalRealtimeProvider";

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

type Contact = {
  userId: string;
  name: string;
  email: string;
  listingId: string | null;
  listingTitle: string | null;
  context: string;
};

function contactValue(c: Contact) {
  return `${c.userId}|${c.listingId || ""}`;
}

function parseContactValue(value: string) {
  const [userId, listingId = ""] = value.split("|");
  return { userId, listingId: listingId || null };
}

export default function MessagesClient() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const meId = session?.user?.id || "";
  const { subscribeMessages, enablePush, pushPermission, pushEnabled } =
    usePortalRealtime();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [selectedContact, setSelectedContact] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushHint, setPushHint] = useState("");
  const activeIdRef = useRef<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const loadConversations = useCallback(async (opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) setLoading(true);
    setError("");
    const [cRes, tRes] = await Promise.all([
      fetch("/api/portal/messages"),
      fetch("/api/portal/messages/contacts"),
    ]);
    const cData = await cRes.json();
    const tData = await tRes.json();
    if (!opts?.quiet) setLoading(false);
    if (!cRes.ok) {
      setError(cData.error || "Unable to load messages.");
      return;
    }
    setConversations(cData.conversations || []);
    if (tRes.ok) setContacts(tData.contacts || []);
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const openThread = useCallback(
    async (id: string, opts?: { quiet?: boolean }) => {
      setActiveId(id);
      setSelectedContact("");
      if (!opts?.quiet) setThreadLoading(true);
      setError("");
      const res = await fetch(`/api/portal/messages/${id}`);
      const data = await res.json();
      if (!opts?.quiet) setThreadLoading(false);
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
      await loadConversations({ quiet: true });
    },
    [loadConversations]
  );

  // Deep-link: ?c=conversationId or ?userId=…
  useEffect(() => {
    const conversationId = searchParams.get("c");
    if (conversationId) {
      void openThread(conversationId);
      return;
    }
    const userId = searchParams.get("userId");
    const listingId = searchParams.get("listingId") || "";
    if (!userId) return;
    setActiveId(null);
    setSelectedContact(`${userId}|${listingId}`);
    // Intentionally only when query string changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Live updates — append incoming messages without refresh
  useEffect(() => {
    return subscribeMessages((event) => {
      const msg = event.message;
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === event.conversationId);
        if (idx === -1) {
          void loadConversations({ quiet: true });
          return prev;
        }
        const next = [...prev];
        const row = { ...next[idx] };
        row.lastPreview = event.preview;
        row.lastMessageAt = msg.createdAt;
        if (
          activeIdRef.current !== event.conversationId &&
          msg.toUserId === meId
        ) {
          row.unreadCount = (row.unreadCount || 0) + 1;
        }
        next.splice(idx, 1);
        next.unshift(row);
        return next;
      });

      if (activeIdRef.current === event.conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [
            ...prev,
            {
              id: msg.id,
              fromUserId: msg.fromUserId,
              toUserId: msg.toUserId,
              body: msg.body,
              read: msg.read,
              createdAt: msg.createdAt,
            },
          ];
        });
        if (msg.toUserId === meId) {
          void fetch(`/api/portal/messages/${event.conversationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markRead: true }),
          });
        }
      }
    });
  }, [subscribeMessages, loadConversations, meId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const contactOptions = useMemo(() => {
    const options = contacts.map((c) => ({
      value: contactValue(c),
      label: c.listingTitle
        ? `${c.name} · ${c.listingTitle}`
        : `${c.name}${c.email ? ` (${c.email})` : ""}`,
    }));

    const userId = searchParams.get("userId");
    const listingId = searchParams.get("listingId") || "";
    const name = searchParams.get("name") || "Contact";
    const listingTitle = searchParams.get("listingTitle");
    if (userId) {
      const value = `${userId}|${listingId}`;
      if (!options.some((o) => o.value === value)) {
        options.unshift({
          value,
          label: listingTitle ? `${name} · ${listingTitle}` : name,
        });
      }
    }
    return options;
  }, [contacts, searchParams]);

  const selectedContactMeta = useMemo(() => {
    if (!selectedContact) return null;
    const { userId, listingId } = parseContactValue(selectedContact);
    const fromList = contacts.find(
      (c) => c.userId === userId && (c.listingId || "") === (listingId || "")
    );
    if (fromList) return fromList;

    if (!userId) return null;
    const deepName = searchParams.get("name");
    const deepTitle = searchParams.get("listingTitle");
    return {
      userId,
      name: deepName || "Contact",
      email: "",
      listingId,
      listingTitle: deepTitle,
      context: "Listing",
    };
  }, [selectedContact, contacts, searchParams]);

  async function onSend(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError("");
    const active = conversations.find((c) => c.id === activeId);

    let toUserId = active?.otherUser?.id || "";
    let listingId: string | undefined;

    if (!activeId) {
      if (!selectedContact) {
        setError("Choose who you want to message.");
        setSending(false);
        return;
      }
      const parsed = parseContactValue(selectedContact);
      toUserId = parsed.userId;
      listingId = parsed.listingId || undefined;
    }

    if (!toUserId || !body.trim()) {
      setError("Choose a recipient and write a message.");
      setSending(false);
      return;
    }

    const payload: Record<string, string> = {
      toUserId,
      body: body.trim(),
    };
    if (activeId) payload.conversationId = activeId;
    if (listingId) payload.listingId = listingId;

    const optimisticBody = body.trim();
    setBody("");

    const res = await fetch("/api/portal/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setBody(optimisticBody);
      setError(data.error || "Could not send message.");
      return;
    }

    setSelectedContact("");
    const cid = data.conversation?.id || activeId;
    if (data.message) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.message.id)) return prev;
        return [
          ...prev,
          {
            id: data.message.id,
            fromUserId: data.message.fromUserId,
            toUserId: data.message.toUserId,
            body: data.message.body,
            read: data.message.read,
            createdAt: data.message.createdAt,
          },
        ];
      });
    }
    if (cid && cid !== activeId) {
      await openThread(cid, { quiet: true });
    } else {
      await loadConversations({ quiet: true });
    }
  }

  async function onEnablePush() {
    setPushBusy(true);
    setPushHint("");
    const ok = await enablePush();
    setPushBusy(false);
    setPushHint(
      ok
        ? "Browser notifications are on."
        : pushPermission === "denied"
          ? "Notifications are blocked in your browser settings."
          : "Could not enable push notifications."
    );
  }

  if (loading) return <TableSkeleton rows={4} />;

  const activeConversation = conversations.find((c) => c.id === activeId);
  const showPushCta =
    pushPermission !== "unsupported" && pushPermission !== "granted";

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {(showPushCta || pushHint) && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm">
          <p className="text-muted flex-1 min-w-[12rem]">
            {pushHint ||
              "Turn on browser notifications so new messages reach you even when this tab is closed."}
          </p>
          {showPushCta ? (
            <button
              type="button"
              className="app-btn app-btn-secondary text-xs"
              disabled={pushBusy}
              onClick={() => void onEnablePush()}
            >
              {pushBusy ? "Enabling…" : "Enable notifications"}
            </button>
          ) : null}
          {pushEnabled && pushPermission === "granted" ? (
            <span className="text-xs text-brand font-medium">Push on</span>
          ) : null}
        </div>
      )}

      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        <div className="space-y-2">
          <h2 className="text-sm font-semibold">Conversations</h2>
          {conversations.length === 0 ? (
            <EmptyState
              title="No conversations yet"
              description="Message a landlord or tenant from a listing, application, or lease."
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

        <div className="app-card p-4 sm:p-5 space-y-4 min-h-[320px] flex flex-col">
          {activeId && activeConversation ? (
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
              <div>
                <p className="font-semibold">
                  {activeConversation.otherUser?.name || "Conversation"}
                </p>
                {activeConversation.listingTitle ? (
                  <p className="text-xs text-muted mt-0.5">
                    About {activeConversation.listingTitle}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="text-xs text-muted hover:text-foreground"
                onClick={() => {
                  setActiveId(null);
                  setMessages([]);
                }}
              >
                New message
              </button>
            </div>
          ) : null}

          {activeId ? (
            <div className="flex-1 min-h-0">
              {threadLoading ? (
                <p className="text-sm text-muted">Loading thread…</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted">No messages in this thread yet.</p>
              ) : (
                <ul className="space-y-3 max-h-[min(28rem,55vh)] overflow-y-auto pr-1">
                  {messages.map((m) => {
                    const mine = meId ? m.fromUserId === meId : false;
                    return (
                      <li
                        key={m.id}
                        className={`text-sm rounded-md px-3 py-2 max-w-[85%] ${
                          mine ? "ml-auto bg-brand-subtle" : "bg-surface-dark"
                        }`}
                      >
                        <p>{m.body}</p>
                        <p className="text-[10px] text-muted mt-1">
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                      </li>
                    );
                  })}
                  <div ref={threadEndRef} />
                </ul>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted">
                Start a conversation with someone from your applications or
                leases — or message a landlord from a listing page. Messages
                update live.
              </p>
              {contactOptions.length === 0 ? (
                <EmptyState
                  title="No contacts yet"
                  description="Apply to a listing or receive an application to unlock messaging."
                >
                  <Link
                    href="/portal/search"
                    className="app-btn app-btn-primary text-sm"
                  >
                    Browse listings
                  </Link>
                </EmptyState>
              ) : null}
            </div>
          )}

          <form onSubmit={onSend} className="space-y-3 border-t border-border pt-4 mt-auto">
            {!activeId ? (
              contactOptions.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1.5">
                    To
                  </label>
                  <Select
                    value={selectedContact}
                    onChange={setSelectedContact}
                    options={contactOptions}
                    placeholder="Choose a person…"
                    required
                  />
                  {selectedContactMeta ? (
                    <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
                      <p className="font-medium">{selectedContactMeta.name}</p>
                      {selectedContactMeta.listingTitle ? (
                        <p className="text-xs text-muted mt-0.5">
                          About {selectedContactMeta.listingTitle}
                          {selectedContactMeta.context
                            ? ` · ${selectedContactMeta.context}`
                            : ""}
                        </p>
                      ) : selectedContactMeta.context ? (
                        <p className="text-xs text-muted mt-0.5">
                          {selectedContactMeta.context}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null
            ) : null}

            {(activeId || contactOptions.length > 0) && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Your message
                  </label>
                  <textarea
                    className="app-input w-full min-h-[80px]"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    required
                    placeholder="Write your message…"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || (!activeId && !selectedContact)}
                  className="app-btn app-btn-primary text-sm"
                >
                  {sending
                    ? "Sending…"
                    : activeId
                      ? "Send"
                      : selectedContactMeta
                        ? `Message ${selectedContactMeta.name}`
                        : "Send"}
                </button>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
