"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import { FormSkeleton } from "@/components/ui/Skeleton";

type Faq = {
  id: string;
  question: string;
  answer: string;
  order: number;
  published: boolean;
};

export default function FaqAdminClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "content:write");

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [order, setOrder] = useState(0);
  const [published, setPublished] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/cms/faqs");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load FAQs.");
      return;
    }
    setFaqs(data.faqs || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/cms/faqs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, answer, order, published }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Create failed.");
      return;
    }
    setQuestion("");
    setAnswer("");
    setOrder(0);
    setPublished(false);
    setMessage("FAQ created.");
    await load();
  }

  async function togglePublish(faq: Faq) {
    if (!canWrite) return;
    setError("");
    const res = await fetch(`/api/admin/cms/faqs/${faq.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !faq.published }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed.");
      return;
    }
    await load();
  }

  async function onDelete(faq: Faq) {
    if (!canWrite) return;
    if (!confirm(`Delete FAQ “${faq.question}”?`)) return;
    setError("");
    const res = await fetch(`/api/admin/cms/faqs/${faq.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Delete failed.");
      return;
    }
    await load();
  }

  if (loading) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-display font-semibold">FAQ</h2>
        <p className="mt-1 text-sm text-muted">
          Manage questions shown on the public /faq page.
        </p>
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

      {canWrite ? (
        <form onSubmit={onCreate} className="app-card p-5 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Question</span>
            <input
              className="app-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Answer</span>
            <textarea
              className="app-input min-h-[100px]"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
            />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Order</span>
              <input
                type="number"
                min={0}
                className="app-input w-24"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value) || 0)}
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm mt-5">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              Publish
            </label>
          </div>
          <button
            type="submit"
            className="app-btn app-btn-primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Add FAQ"}
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {faqs.length === 0 ? (
          <p className="text-sm text-muted">No FAQs yet.</p>
        ) : (
          faqs.map((faq) => (
            <div key={faq.id} className="app-card p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-medium text-sm">{faq.question}</p>
                <span className="text-xs text-muted">
                  #{faq.order} · {faq.published ? "Published" : "Draft"}
                </span>
              </div>
              <p className="text-sm text-muted line-clamp-3">{faq.answer}</p>
              {canWrite ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="app-btn app-btn-secondary text-xs"
                    onClick={() => void togglePublish(faq)}
                  >
                    {faq.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    className="app-btn app-btn-danger text-xs"
                    onClick={() => void onDelete(faq)}
                  >
                    Delete
                  </button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
