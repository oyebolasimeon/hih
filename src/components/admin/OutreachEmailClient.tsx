"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import { FormSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

type OutreachTemplate = {
  id: "services_offers" | "talent_recruit" | "investor_pitch";
  category: "growth" | "talent" | "investors";
  label: string;
  description: string;
  subject: string;
  html: string;
};

type Recipient = {
  key: string;
  email: string;
  name: string;
  userId?: string;
  source: "manual" | "user";
};

type AppUser = {
  id: string;
  name: string;
  email: string;
};

const CATEGORY_LABEL: Record<OutreachTemplate["category"], string> = {
  growth: "Services & offers",
  talent: "Talent",
  investors: "Investors",
};

export default function OutreachEmailClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "content:write");

  const [templates, setTemplates] = useState<OutreachTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userHits, setUserHits] = useState<AppUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [sending, setSending] = useState(false);

  const selected = useMemo(
    () => templates.find((t) => t.id === selectedId) || null,
    [templates, selectedId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/outreach/templates");
      const data = await res.json();
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Unable to load outreach templates.");
        return;
      }
      const list = (data.templates || []) as OutreachTemplate[];
      setTemplates(list);
      if (list[0]) {
        setSelectedId(list[0].id);
        setSubject(list[0].subject);
        setHtml(list[0].html);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function pickTemplate(t: OutreachTemplate) {
    setSelectedId(t.id);
    setSubject(t.subject);
    setHtml(t.html);
    setMessage("");
    setError("");
  }

  function resetToTemplate() {
    if (!selected) return;
    setSubject(selected.subject);
    setHtml(selected.html);
  }

  function addManualRecipient() {
    const email = manualEmail.trim().toLowerCase();
    const name = manualName.trim();
    if (!email || !email.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (recipients.some((r) => r.email === email)) {
      setError("That email is already in the recipient list.");
      return;
    }
    setRecipients((prev) => [
      ...prev,
      {
        key: `manual-${email}`,
        email,
        name,
        source: "manual",
      },
    ]);
    setManualName("");
    setManualEmail("");
    setError("");
  }

  function addUserRecipient(u: AppUser) {
    const email = u.email.trim().toLowerCase();
    if (recipients.some((r) => r.email === email)) {
      setError("That user is already in the recipient list.");
      return;
    }
    setRecipients((prev) => [
      ...prev,
      {
        key: `user-${u.id}`,
        email,
        name: u.name || "",
        userId: u.id,
        source: "user",
      },
    ]);
    setError("");
  }

  function removeRecipient(key: string) {
    setRecipients((prev) => prev.filter((r) => r.key !== key));
  }

  useEffect(() => {
    if (!userSearch.trim()) {
      setUserHits([]);
      return;
    }
    const handle = setTimeout(async () => {
      setSearchingUsers(true);
      const res = await fetch(
        `/api/admin/outreach/users?search=${encodeURIComponent(userSearch.trim())}`
      );
      const data = await res.json();
      setSearchingUsers(false);
      if (!res.ok) return;
      setUserHits(
        (data.users || []).map((u: AppUser) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }))
      );
    }, 300);
    return () => clearTimeout(handle);
  }, [userSearch]);

  async function send() {
    if (!selected || !canWrite) return;
    if (!recipients.length) {
      setError("Add at least one recipient.");
      return;
    }
    if (subject.trim().length < 2) {
      setError("Subject is required.");
      return;
    }
    setSending(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/outreach/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateId: selected.id,
        subject: subject.trim(),
        html,
        recipients: recipients.map((r) => ({
          email: r.email,
          name: r.name,
          userId: r.userId,
        })),
      }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(data.error || "Send failed.");
      return;
    }
    setMessage(
      `Sent ${data.sent} email${data.sent === 1 ? "" : "s"}${
        data.failed ? ` · ${data.failed} failed` : ""
      }.`
    );
    if (data.failed === 0) setRecipients([]);
  }

  if (loading) return <FormSkeleton />;

  if (!templates.length) {
    return (
      <EmptyState
        title="No outreach templates"
        description="Outreach content is not available yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">
          Outreach emails
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Pick a ready-made message (services, talent or investors), personalise
          it, then send to app users or any email — using the House In Hands
          branded template.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-teal/30 bg-teal/10 px-3 py-2 text-sm text-teal-dark">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-2">
          {templates.map((t) => {
            const active = t.id === selectedId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => pickTemplate(t)}
                className={`w-full rounded-md border px-3 py-3 text-left transition ${
                  active
                    ? "border-teal bg-brand-subtle"
                    : "border-border bg-surface hover:border-teal/50"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                  {CATEGORY_LABEL[t.category]}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {t.label}
                </p>
                <p className="mt-1 text-xs text-muted line-clamp-2">
                  {t.description}
                </p>
              </button>
            );
          })}
        </aside>

        <div className="space-y-6">
          {selected ? (
            <>
              <section className="rounded-md border border-border bg-surface p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-lg font-semibold">
                    {selected.label}
                  </h2>
                  <button
                    type="button"
                    onClick={resetToTemplate}
                    className="text-xs font-semibold text-teal-dark hover:underline"
                  >
                    Reset to saved copy
                  </button>
                </div>
                <p className="text-sm text-muted">{selected.description}</p>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Subject
                  </label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="app-input"
                    disabled={!canWrite}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Body (HTML · wrapped in branded email shell)
                  </label>
                  <textarea
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                    rows={14}
                    className="app-input font-mono text-xs leading-relaxed"
                    disabled={!canWrite}
                  />
                  <p className="mt-1.5 text-xs text-muted">
                    Placeholders: {"{{name}}"}, {"{{email}}"}, {"{{appUrl}}"},{" "}
                    {"{{portalUrl}}"}, {"{{year}}"}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted mb-2">
                    Preview (inner body)
                  </p>
                  <div
                    className="prose prose-sm max-w-none text-foreground [&_a]:text-teal-dark"
                    dangerouslySetInnerHTML={{
                      __html: html
                        .replace(/\{\{\s*name\s*\}\}/gi, "Alex")
                        .replace(/\{\{\s*email\s*\}\}/gi, "alex@example.com")
                        .replace(
                          /\{\{\s*appUrl\s*\}\}/gi,
                          "https://www.houseinhands.com"
                        )
                        .replace(
                          /\{\{\s*portalUrl\s*\}\}/gi,
                          "https://www.houseinhands.com/portal"
                        )
                        .replace(/\{\{\s*year\s*\}\}/gi, String(new Date().getFullYear())),
                    }}
                  />
                </div>
              </section>

              <section className="rounded-md border border-border bg-surface p-4 sm:p-5 space-y-5">
                <h2 className="font-display text-lg font-semibold">
                  Recipients
                </h2>

                <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Name
                    </label>
                    <input
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      className="app-input"
                      placeholder="Ada Okafor"
                      disabled={!canWrite}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Email
                    </label>
                    <input
                      type="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      className="app-input"
                      placeholder="ada@example.com"
                      disabled={!canWrite}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addManualRecipient();
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={addManualRecipient}
                      disabled={!canWrite}
                      className="app-btn app-btn-secondary w-full sm:w-auto"
                    >
                      Add email
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Or pick from app users
                  </label>
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="app-input"
                    placeholder="Search by name or email…"
                    disabled={!canWrite}
                  />
                  {searchingUsers ? (
                    <p className="mt-2 text-xs text-muted">Searching…</p>
                  ) : null}
                  {userHits.length > 0 ? (
                    <ul className="mt-2 max-h-48 overflow-auto divide-y divide-border rounded-md border border-border">
                      {userHits.map((u) => (
                        <li
                          key={u.id}
                          className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {u.name || "—"}
                            </p>
                            <p className="text-xs text-muted truncate">
                              {u.email}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={!canWrite}
                            onClick={() => addUserRecipient(u)}
                            className="shrink-0 text-xs font-semibold text-teal-dark hover:underline"
                          >
                            Add
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {recipients.length === 0 ? (
                  <p className="text-sm text-muted">
                    No recipients yet. Add a custom email or an app user.
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-md border border-border">
                    {recipients.map((r) => (
                      <li
                        key={r.key}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">
                            {r.name || "Recipient"}{" "}
                            <span className="text-[10px] uppercase tracking-wide text-muted">
                              {r.source}
                            </span>
                          </p>
                          <p className="text-xs text-muted">{r.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRecipient(r.key)}
                          className="text-xs font-semibold text-red-600 hover:underline"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap gap-3 pt-1">
                  <button
                    type="button"
                    disabled={!canWrite || sending || recipients.length === 0}
                    onClick={() => void send()}
                    className="app-btn app-btn-primary"
                  >
                    {sending
                      ? "Sending…"
                      : `Send to ${recipients.length || 0} recipient${
                          recipients.length === 1 ? "" : "s"
                        }`}
                  </button>
                  {!canWrite ? (
                    <p className="text-xs text-muted self-center">
                      You need content:write permission to send.
                    </p>
                  ) : null}
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
