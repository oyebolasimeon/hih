"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import Select from "@/components/ui/Select";
import { FormSkeleton } from "@/components/ui/Skeleton";

type Announcement = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  audience: string;
  showModal: boolean;
  sendEmail: boolean;
  active: boolean;
  publishedAt: string | null;
  emailSentAt: string | null;
  emailSentCount: number;
  emailFailedCount: number;
};

const AUDIENCE_OPTIONS = [
  { value: "all", label: "Everyone" },
  { value: "landlords", label: "Landlords" },
  { value: "tenants", label: "Tenants" },
  { value: "students", label: "Students" },
  { value: "estate_managers", label: "Estate managers" },
];

export default function AnnouncementsAdminClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "content:write");

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audience, setAudience] = useState("all");
  const [showModal, setShowModal] = useState(true);
  const [sendEmail, setSendEmail] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/cms/announcements");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load announcements.");
      return;
    }
    setItems(data.announcements || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/cms/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        subtitle,
        body,
        ctaLabel,
        ctaUrl,
        imageUrl,
        audience,
        showModal,
        sendEmail,
        active: true,
        publishAndEmail: sendEmail,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not publish announcement.");
      return;
    }
    setTitle("");
    setSubtitle("");
    setBody("");
    setCtaLabel("");
    setCtaUrl("");
    setImageUrl("");
    setAudience("all");
    setShowModal(true);
    setSendEmail(true);
    const emailNote = data.emailResult
      ? ` Emails sent: ${data.emailResult.sent}${
          data.emailResult.failed ? ` (${data.emailResult.failed} failed)` : ""
        }.`
      : "";
    setMessage(`Announcement published.${emailNote}`);
    await load();
  }

  async function toggleActive(item: Announcement) {
    if (!canWrite) return;
    setError("");
    const res = await fetch(`/api/admin/cms/announcements/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed.");
      return;
    }
    await load();
  }

  async function resendEmail(item: Announcement) {
    if (!canWrite) return;
    if (
      !confirm(
        `Send “${item.title}” to all matching recipients again? This may email many users.`
      )
    ) {
      return;
    }
    setError("");
    setMessage("");
    const res = await fetch(`/api/admin/cms/announcements/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sendEmailNow: true, active: true }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Email send failed.");
      return;
    }
    setMessage(
      data.emailResult
        ? `Emails sent: ${data.emailResult.sent}${
            data.emailResult.failed
              ? ` (${data.emailResult.failed} failed)`
              : ""
          }.`
        : "Email blast finished."
    );
    await load();
  }

  async function onDelete(item: Announcement) {
    if (!canWrite) return;
    if (!confirm(`Delete announcement “${item.title}”?`)) return;
    const res = await fetch(`/api/admin/cms/announcements/${item.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Delete failed.");
      return;
    }
    await load();
  }

  function useFlyerTemplate() {
    setTitle("You're invited to our Landlord & Tenant Stakeholder Meeting");
    setSubtitle("Better Homes. Stronger Communities. A Smarter Way to Property.");
    setBody(
      [
        "Be part of an exciting conversation about a smarter, simpler and more transparent way to manage, rent and experience property.",
        "",
        "What you'll gain:",
        "• Direct connections — no unnecessary middlemen fees",
        "• Secure transactions — trusted, verified landlords and tenants",
        "• Smarter management — manage properties with ease",
        "• Flexible payments — convenient and transparent options",
        "• Valuable insights — make better decisions with real data",
        "",
        "Date: Coming soon",
        "Venue: Details will be shared",
        "Who should attend: Landlords | Tenants | Estate Builders & Property Partners",
        "",
        "Don't miss out — let's build a better property experience together.",
        "Your Property Matters.",
      ].join("\n")
    );
    setCtaLabel("Learn more");
    setCtaUrl("/about");
    setImageUrl("/brand/stakeholder-meeting-flyer.png");
    setAudience("all");
    setShowModal(true);
    setSendEmail(true);
  }

  if (loading) return <FormSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-semibold">Announcements</h2>
          <p className="mt-1 text-sm text-muted max-w-2xl">
            Publish a site-wide popup for everyone and email registered users in
            one action. Only one modal announcement is active at a time.
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={useFlyerTemplate}
            className="app-btn app-btn-secondary text-sm"
          >
            Load stakeholder meeting template
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-teal-dark">{message}</p> : null}

      {canWrite ? (
        <form onSubmit={onCreate} className="app-card p-4 sm:p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Title</label>
              <input
                className="app-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                minLength={3}
                maxLength={200}
                placeholder="Announcement headline"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">
                Subtitle (optional)
              </label>
              <input
                className="app-input"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                maxLength={300}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Body</label>
              <textarea
                className="app-input min-h-[140px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
                maxLength={20000}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                CTA label
              </label>
              <input
                className="app-input"
                value={ctaLabel}
                onChange={(e) => setCtaLabel(e.target.value)}
                placeholder="e.g. Learn more"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">CTA URL</label>
              <input
                className="app-input"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                placeholder="/about or https://…"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">
                Image URL (optional)
              </label>
              <input
                className="app-input"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="/brand/stakeholder-meeting-flyer.png"
              />
            </div>
            <Select
              label="Audience (email targeting)"
              value={audience}
              onChange={setAudience}
              options={AUDIENCE_OPTIONS}
            />
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showModal}
                onChange={(e) => setShowModal(e.target.checked)}
              />
              Show as website popup
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
              />
              Email everyone (respects notification prefs)
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="app-btn app-btn-primary text-sm"
          >
            {saving ? "Publishing…" : "Publish announcement"}
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted">No announcements yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="app-card p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted mt-1">
                    {item.active ? "Active" : "Inactive"}
                    {item.showModal ? " · Modal" : ""}
                    {item.emailSentAt
                      ? ` · Emailed ${item.emailSentCount}`
                      : item.sendEmail
                        ? " · Email pending"
                        : ""}
                    {" · "}
                    {item.audience}
                  </p>
                </div>
                {canWrite ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="app-btn app-btn-secondary text-xs"
                      onClick={() => void toggleActive(item)}
                    >
                      {item.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      className="app-btn app-btn-secondary text-xs"
                      onClick={() => void resendEmail(item)}
                    >
                      Send emails
                    </button>
                    <button
                      type="button"
                      className="app-btn app-btn-danger text-xs"
                      onClick={() => void onDelete(item)}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
              <p className="text-sm text-muted line-clamp-3 whitespace-pre-wrap">
                {item.body}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
