"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";
import ImageFilePicker from "@/components/ui/ImageFilePicker";
import { ImageGallery } from "@/components/ui/ImageViewer";

type Content = {
  imageUrl: string;
  imagePublicId: string;
};

export default function AuthBackgroundClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "content:write");

  const [content, setContent] = useState<Content | null>(null);
  const [defaultUrl, setDefaultUrl] = useState("/hero-london.png");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pickerFiles, setPickerFiles] = useState<File[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/site/auth-background");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load auth background.");
      return;
    }
    setContent(data.content);
    setDefaultUrl(data.defaults?.imageUrl || "/hero-london.png");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUpload(file: File | null) {
    if (!file || !canWrite) return;
    setUploading(true);
    setError("");
    setMessage("");
    const form = new FormData();
    form.append("image", file);
    const res = await fetch("/api/admin/site/auth-background", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setUploading(false);
    setPickerFiles([]);
    if (!res.ok) {
      setError(data.error || "Upload failed.");
      return;
    }
    setContent(data.content);
    setMessage("Auth background updated. Sign-in pages will use it immediately.");
  }

  async function onReset() {
    if (!canWrite) return;
    if (!confirm("Reset to the default background image?")) return;
    setUploading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/site/auth-background", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearImage: true }),
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error || "Reset failed.");
      return;
    }
    setContent(data.content);
    setMessage("Auth background reset to default.");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <FormSkeleton />
      </div>
    );
  }

  const previewUrl = content?.imageUrl || defaultUrl;
  const isCustom = Boolean(content?.imagePublicId);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-display font-semibold">Auth page background</h2>
        <p className="mt-1 text-sm text-muted">
          Full-bleed image behind sign in, register, password reset, and email
          verification. Upload a wide photo (interior / skyline works best).
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

      <div className="app-card overflow-hidden">
        <div className="aspect-[16/10] relative bg-surface-dark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Auth background preview"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
          <p className="absolute bottom-3 left-3 text-xs text-white/90">
            {isCustom ? "Custom upload" : "Default image"} · Preview with overlay
          </p>
        </div>
        <div className="p-5 space-y-4">
          {previewUrl ? (
            <ImageGallery images={[previewUrl]} title="Auth background" />
          ) : null}
          <ImageFilePicker
            label="Background image"
            multiple={false}
            value={pickerFiles}
            onChange={(files) => {
              setPickerFiles(files);
              if (files[0]) void onUpload(files[0]);
            }}
            disabled={!canWrite || uploading}
            helpText="Choose one wide image, preview, confirm — it uploads immediately."
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="app-btn app-btn-secondary text-sm"
              disabled={!canWrite || uploading || !isCustom}
              onClick={() => void onReset()}
            >
              {uploading ? "Working…" : "Reset to default"}
            </button>
          </div>
          {!canWrite ? (
            <p className="text-xs text-muted">Read-only: you lack content:write.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
