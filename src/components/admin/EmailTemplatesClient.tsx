"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import EmailRichEditor from "@/components/admin/EmailRichEditor";
import Checkbox from "@/components/ui/Checkbox";
import { hasPermission } from "@/lib/rbac";
import {
  EMAIL_ACTION_DESCRIPTIONS,
  EMAIL_ACTION_LABELS,
  type EmailAction,
} from "@/lib/email-templates";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

type Template = {
  id: string;
  name: string;
  subject: string;
  html: string;
  isDefault: boolean;
  actions: EmailAction[];
  active: boolean;
};

type ActionRow = {
  key: EmailAction;
  label: string;
  templateId: string | null;
};

type Variable = { key: string; label: string };

const blank = (): Omit<Template, "id"> => ({
  name: "",
  subject: "",
  html: "<p>Hi {{name}},</p><p></p><p>— House In Hand</p>",
  isDefault: false,
  actions: [],
  active: true,
});

export default function EmailTemplatesClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "content:write");

  const [templates, setTemplates] = useState<Template[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(blank());
  const [previewHtml, setPreviewHtml] = useState("");
  const [showEditor, setShowEditor] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/email-templates");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load templates.");
      return;
    }
    setTemplates(data.templates || []);
    setActions(data.actions || []);
    setVariables(data.variables || []);
    setDefaultTemplateId(data.defaultTemplateId || null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actionCoverage = useMemo(() => {
    return actions.map((a) => {
      const assigned = templates.find((t) => t.id === a.templateId);
      const fallback = templates.find((t) => t.id === defaultTemplateId);
      const usesBuiltinAuth =
        !assigned &&
        (a.key === "email_verify" || a.key === "password_reset");
      return {
        ...a,
        assignedName: assigned?.name || null,
        fallbackName: usesBuiltinAuth
          ? a.key === "email_verify"
            ? "Built-in verify email (with link)"
            : "Built-in password reset (with link)"
          : fallback?.name || "Fallback template",
      };
    });
  }, [actions, templates, defaultTemplateId]);

  const fallbackTemplate = useMemo(
    () => templates.find((t) => t.id === defaultTemplateId) || null,
    [templates, defaultTemplateId]
  );

  function startCreate() {
    setEditingId(null);
    setDraft(blank());
    setPreviewHtml("");
    setShowEditor(true);
    setMessage("");
    setError("");
  }

  function startEdit(t: Template) {
    setEditingId(t.id);
    setDraft({
      name: t.name,
      subject: t.subject,
      html: t.html,
      isDefault: t.isDefault,
      actions: [...t.actions],
      active: t.active,
    });
    setPreviewHtml(t.html);
    setShowEditor(true);
    setMessage("");
    setError("");
  }

  function startEditFallback() {
    if (fallbackTemplate) {
      startEdit(fallbackTemplate);
      return;
    }
    // Safety: create locally as default if API somehow had none
    setEditingId(null);
    setDraft({
      name: "Fallback (default)",
      subject: "Message from House In Hand",
      html: "<p>Hi {{name}},</p><p>This is a message from House In Hand.</p><p><a href=\"{{loginUrl}}\">Sign in to your account</a></p><p>— House In Hand</p>",
      isDefault: true,
      actions: [],
      active: true,
    });
    setPreviewHtml("");
    setShowEditor(true);
    setMessage("");
    setError("");
  }

  function toggleAction(action: EmailAction) {
    setDraft((d) => ({
      ...d,
      actions: d.actions.includes(action)
        ? d.actions.filter((a) => a !== action)
        : [...d.actions, action],
    }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError("");
    setMessage("");

    const payload = {
      name: draft.name,
      subject: draft.subject,
      html: draft.html,
      isDefault: draft.isDefault,
      actions: draft.actions,
      active: draft.active,
    };

    const res = await fetch(
      editingId
        ? `/api/admin/email-templates/${editingId}`
        : "/api/admin/email-templates",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Save failed.");
      return;
    }
    setMessage(editingId ? "Template updated." : "Template created.");
    setShowEditor(false);
    setEditingId(null);
    await load();
  }

  async function onDelete(id: string) {
    if (!canWrite) return;
    if (!confirm("Delete this email template?")) return;
    const res = await fetch(`/api/admin/email-templates/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Delete failed.");
      return;
    }
    setMessage("Template deleted.");
    if (editingId === id) setShowEditor(false);
    await load();
  }

  async function sendPreview() {
    if (!editingId || !canWrite) {
      setError("Save the template first, then send a preview.");
      return;
    }
    const res = await fetch(`/api/admin/email-templates/${editingId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ send: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Preview send failed.");
      return;
    }
    setMessage(`Preview sent to ${data.sentTo}.`);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <FormSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">
            Email templates
          </h1>
          <p className="mt-1 text-sm text-muted max-w-2xl">
            Design branded emails, attach them to system actions, and set a
            default for actions without a dedicated template.
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            className="app-btn app-btn-primary shrink-0"
            onClick={startCreate}
          >
            New template
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-foreground" role="status">
          {message}
        </p>
      ) : null}

      <section className="app-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Fallback email template</h2>
            <p className="text-sm text-muted mt-1">
              Used for any system action that doesn&apos;t have its own template
              attached. This is always editable.
            </p>
            {fallbackTemplate ? (
              <p className="mt-2 text-sm">
                Current:{" "}
                <span className="font-medium">{fallbackTemplate.name}</span>
                <span className="text-muted">
                  {" "}
                  · {fallbackTemplate.subject}
                </span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="app-btn app-btn-primary shrink-0"
            onClick={startEditFallback}
            disabled={!canWrite && !fallbackTemplate}
          >
            {canWrite ? "Edit fallback" : "View fallback"}
          </button>
        </div>
      </section>

      <section className="app-card p-5 space-y-3">
        <h2 className="font-semibold">Action bindings</h2>
        <p className="text-sm text-muted">
          If an action has no dedicated template, it uses the fallback above —
          except Verify email and Password reset, which always keep their
          built-in link emails unless you attach a custom template to them.
        </p>
        <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {actionCoverage.map((a) => (
            <div
              key={a.key}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 bg-surface/40"
            >
              <div>
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-muted">
                  {EMAIL_ACTION_DESCRIPTIONS[a.key]}
                </p>
              </div>
              <p className="text-xs sm:text-sm text-muted shrink-0">
                {a.assignedName ? (
                  <>
                    Using <span className="text-foreground font-medium">{a.assignedName}</span>
                  </>
                ) : (
                  <>
                    Falls back to{" "}
                    <span className="text-foreground font-medium">
                      {a.fallbackName}
                    </span>
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      </section>

      {showEditor ? (
        <form onSubmit={onSave} className="app-card p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">
              {editingId
                ? draft.isDefault
                  ? "Edit fallback template"
                  : "Edit template"
                : draft.isDefault
                  ? "New fallback template"
                  : "New template"}
            </h2>
            <button
              type="button"
              className="text-sm text-muted hover:text-foreground"
              onClick={() => setShowEditor(false)}
            >
              Close
            </button>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input
                  className="app-input"
                  required
                  disabled={!canWrite}
                  value={draft.name}
                  onChange={(e) =>
                    setDraft({ ...draft, name: e.target.value })
                  }
                  placeholder="Welcome email — branded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Subject
                </label>
                <input
                  className="app-input"
                  required
                  disabled={!canWrite}
                  value={draft.subject}
                  onChange={(e) =>
                    setDraft({ ...draft, subject: e.target.value })
                  }
                  placeholder="Welcome to House In Hand"
                />
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Attach to actions</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(Object.keys(EMAIL_ACTION_LABELS) as EmailAction[]).map(
                    (action) => (
                      <Checkbox
                        key={action}
                        variant="card"
                        label={EMAIL_ACTION_LABELS[action]}
                        checked={draft.actions.includes(action)}
                        disabled={!canWrite}
                        onChange={() => toggleAction(action)}
                      />
                    )
                  )}
                </div>
              </div>

              <Checkbox
                label="Fallback (default) template"
                description={
                  draft.isDefault && editingId === defaultTemplateId
                    ? "This is the fallback for unassigned actions. Keep this on."
                    : "When enabled, this becomes the fallback for actions without their own template."
                }
                checked={draft.isDefault}
                disabled={
                  !canWrite ||
                  (Boolean(editingId) &&
                    editingId === defaultTemplateId &&
                    draft.isDefault)
                }
                onChange={(checked) =>
                  setDraft({ ...draft, isDefault: checked })
                }
              />
              <Checkbox
                label="Active"
                checked={draft.active}
                disabled={!canWrite}
                onChange={(checked) =>
                  setDraft({ ...draft, active: checked })
                }
              />

              <div>
                <p className="text-sm font-medium mb-1.5">Insert variable</p>
                <div className="flex flex-wrap gap-1.5">
                  {variables.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] font-mono hover:border-brand hover:bg-brand-subtle"
                      title={v.label}
                      onClick={() =>
                        setDraft((d) => ({
                          ...d,
                          html: `${d.html}<p>${v.key}</p>`,
                        }))
                      }
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Body</p>
              <EmailRichEditor
                value={draft.html}
                disabled={!canWrite}
                onChange={(html) => {
                  setDraft((d) => ({ ...d, html }));
                  setPreviewHtml(html);
                }}
              />
              <p className="text-xs text-muted">
                Tip: links and images are supported. Subject and body accept
                placeholders like {"{{name}}"} and {"{{loginUrl}}"}.
              </p>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-medium">Live HTML preview</p>
            <div
              className="rounded-md border border-border bg-white text-[#0c0d0b] p-4 text-sm max-h-64 overflow-auto"
              dangerouslySetInnerHTML={{
                __html: previewHtml || draft.html,
              }}
            />
          </div>

          {canWrite ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="app-btn app-btn-primary"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save template"}
              </button>
              {editingId ? (
                <button
                  type="button"
                  className="app-btn app-btn-secondary"
                  onClick={() => void sendPreview()}
                >
                  Send test to me
                </button>
              ) : null}
            </div>
          ) : null}
        </form>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold">Templates</h2>
        {templates.length === 0 ? (
          <EmptyState
            title="No custom templates yet"
            description="Create one and attach it to Welcome, Password reset, Admin invite, or Portfolio update — or use Edit fallback above."
          />
        ) : (
          <div className="space-y-3">
            {templates.map((t) => (
              <div key={t.id} className="app-card p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-muted">{t.subject}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {t.isDefault ? (
                      <span className="rounded-md border border-brand/30 bg-brand-subtle px-2 py-0.5 text-[11px] font-medium">
                        Fallback
                      </span>
                    ) : null}
                    {!t.active ? (
                      <span className="rounded-md border border-border px-2 py-0.5 text-[11px] text-muted">
                        Inactive
                      </span>
                    ) : null}
                    {t.actions.map((a) => (
                      <span
                        key={a}
                        className="rounded-md border border-border px-2 py-0.5 text-[11px]"
                      >
                        {EMAIL_ACTION_LABELS[a]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className="app-btn app-btn-secondary text-xs"
                    onClick={() => startEdit(t)}
                  >
                    {canWrite ? "Edit" : "View"}
                  </button>
                  {canWrite && !t.isDefault ? (
                    <button
                      type="button"
                      className="app-btn app-btn-danger text-xs"
                      onClick={() => void onDelete(t.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
