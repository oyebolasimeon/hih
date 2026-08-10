"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import { FormSkeleton } from "@/components/ui/Skeleton";

type Testimonial = {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  order: number;
  published: boolean;
};

export default function TestimonialsAdminClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "content:write");

  const [items, setItems] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [quote, setQuote] = useState("");
  const [rating, setRating] = useState(5);
  const [order, setOrder] = useState(0);
  const [published, setPublished] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/cms/testimonials");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load testimonials.");
      return;
    }
    setItems(data.testimonials || []);
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
    const res = await fetch("/api/admin/cms/testimonials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, quote, rating, order, published }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Create failed.");
      return;
    }
    setName("");
    setRole("");
    setQuote("");
    setRating(5);
    setOrder(0);
    setPublished(false);
    setMessage("Testimonial created.");
    await load();
  }

  async function togglePublish(item: Testimonial) {
    if (!canWrite) return;
    setError("");
    const res = await fetch(`/api/admin/cms/testimonials/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !item.published }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed.");
      return;
    }
    await load();
  }

  async function onDelete(item: Testimonial) {
    if (!canWrite) return;
    if (!confirm(`Delete testimonial from “${item.name}”?`)) return;
    setError("");
    const res = await fetch(`/api/admin/cms/testimonials/${item.id}`, {
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
        <h2 className="text-lg font-display font-semibold">Testimonials</h2>
        <p className="mt-1 text-sm text-muted">
          Quotes from renters, landlords, and partners.
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
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Name</span>
              <input
                className="app-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Role</span>
              <input
                className="app-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                required
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Quote</span>
            <textarea
              className="app-input min-h-[100px]"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              required
            />
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Rating</span>
              <input
                type="number"
                min={1}
                max={5}
                className="app-input w-24"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value) || 5)}
              />
            </label>
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
            {saving ? "Saving…" : "Add testimonial"}
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted">No testimonials yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="app-card p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-xs text-muted">{item.role}</p>
                </div>
                <span className="text-xs text-muted">
                  {item.rating}/5 · {item.published ? "Published" : "Draft"}
                </span>
              </div>
              <p className="text-sm text-muted line-clamp-3">{item.quote}</p>
              {canWrite ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="app-btn app-btn-secondary text-xs"
                    onClick={() => void togglePublish(item)}
                  >
                    {item.published ? "Unpublish" : "Publish"}
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
          ))
        )}
      </div>
    </div>
  );
}
