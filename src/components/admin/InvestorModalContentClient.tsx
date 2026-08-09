"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";
import ImageFilePicker from "@/components/ui/ImageFilePicker";
import { ImageGallery } from "@/components/ui/ImageViewer";

type Content = {
  title: string;
  body: string;
  ctaLabel: string;
  imageUrl: string;
  imagePublicId: string;
};

export default function InvestorModalContentClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "content:write");

  const [content, setContent] = useState<Content | null>(null);
  const [defaults, setDefaults] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/site/investor-modal");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load content.");
      return;
    }
    setContent(data.content);
    setDefaults(data.defaults);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!content || !canWrite) return;
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/site/investor-modal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: content.title,
        body: content.body,
        ctaLabel: content.ctaLabel,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Save failed.");
      return;
    }
    setContent(data.content);
    setMessage("Login modal content saved. Marketing site will use it immediately.");
  }

  async function onUpload(file: File | null) {
    if (!file || !canWrite) return;
    setUploading(true);
    setError("");
    setMessage("");
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/admin/site/investor-modal", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error || "Upload failed.");
      return;
    }
    setContent(data.content);
    setMessage("Image uploaded.");
  }

  async function clearImage() {
    if (!canWrite) return;
    if (!confirm("Remove the modal image and show the placeholder again?")) return;
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/site/investor-modal", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearImage: true }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not clear image.");
      return;
    }
    setContent(data.content);
    setMessage("Image cleared. Placeholder will show until you upload another.");
  }

  function restoreDefaults() {
    if (!defaults || !content) return;
    setContent({
      ...content,
      title: defaults.title,
      body: defaults.body,
      ctaLabel: defaults.ctaLabel,
    });
    setMessage("Defaults restored in the form — click Save to publish.");
  }

  if (loading || !content) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <FormSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Investor Login modal
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Controls the typewriter intro that appears when visitors click Investor
          Login on the marketing site. Add an image that fits the modal panel
          (portrait or square works best).
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

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="app-card p-5 space-y-4">
          <h2 className="font-semibold">Modal image</h2>
          <div className="aspect-[4/5] w-full overflow-hidden rounded-lg border border-border bg-surface-dark">
            {content.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={content.imageUrl}
                alt="Modal hero"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
                </div>
                <p className="text-sm font-medium">Placeholder</p>
                <p className="text-xs text-muted">
                  Shown on the site until you upload an image.
                </p>
              </div>
            )}
          </div>
          {canWrite ? (
            <div className="space-y-3">
              <ImageFilePicker
                label="Replace modal image"
                multiple={false}
                value={[]}
                disabled={uploading}
                helpText="Preview the image, confirm, then it uploads immediately."
                onChange={(files) => {
                  if (files[0]) void onUpload(files[0]);
                }}
              />
              {content.imageUrl ? (
                <>
                  <ImageGallery images={[content.imageUrl]} title="Login modal image" />
                  <button
                    type="button"
                    className="app-btn app-btn-danger text-sm"
                    onClick={() => void clearImage()}
                    disabled={saving}
                  >
                    Remove image
                  </button>
                </>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-muted">Read-only: you lack content:write.</p>
          )}
        </section>

        <form onSubmit={onSave} className="app-card p-5 space-y-4">
          <h2 className="font-semibold">Copy</h2>
          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <input
              className="app-input"
              value={content.title}
              disabled={!canWrite}
              onChange={(e) =>
                setContent({ ...content, title: e.target.value })
              }
              required
              maxLength={120}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Body (typewriter text)
            </label>
            <textarea
              className="app-input min-h-[280px] font-mono text-xs leading-relaxed"
              value={content.body}
              disabled={!canWrite}
              onChange={(e) =>
                setContent({ ...content, body: e.target.value })
              }
              required
              maxLength={8000}
            />
            <p className="mt-1 text-xs text-muted">
              Line breaks and bullet characters are preserved in the modal.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Continue button label
            </label>
            <input
              className="app-input"
              value={content.ctaLabel}
              disabled={!canWrite}
              onChange={(e) =>
                setContent({ ...content, ctaLabel: e.target.value })
              }
              required
              maxLength={60}
            />
          </div>
          {canWrite ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="app-btn app-btn-primary"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save content"}
              </button>
              <button
                type="button"
                className="app-btn app-btn-secondary"
                onClick={restoreDefaults}
              >
                Restore defaults
              </button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
