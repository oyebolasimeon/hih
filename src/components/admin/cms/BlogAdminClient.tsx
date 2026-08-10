"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import { FormSkeleton } from "@/components/ui/Skeleton";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  status: string;
  published: boolean;
  publishedAt: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

export default function BlogAdminClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "content:write");

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/cms/blog");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load posts.");
      return;
    }
    setPosts(data.posts || []);
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
    const res = await fetch("/api/admin/cms/blog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        slug: slug || slugify(title),
        excerpt,
        body,
        published,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Create failed.");
      return;
    }
    setTitle("");
    setSlug("");
    setExcerpt("");
    setBody("");
    setPublished(false);
    setSlugTouched(false);
    setMessage("Post created.");
    await load();
  }

  async function togglePublish(post: Post) {
    if (!canWrite) return;
    setError("");
    const res = await fetch(`/api/admin/cms/blog/${post.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !post.published }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed.");
      return;
    }
    await load();
  }

  async function onDelete(post: Post) {
    if (!canWrite) return;
    if (!confirm(`Delete “${post.title}”?`)) return;
    setError("");
    const res = await fetch(`/api/admin/cms/blog/${post.id}`, {
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
        <h2 className="text-lg font-display font-semibold">Blog</h2>
        <p className="mt-1 text-sm text-muted">
          Create and publish posts for the public /blog pages.
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
              <span className="text-xs font-medium text-muted">Title</span>
              <input
                className="app-input"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted">Slug</span>
              <input
                className="app-input"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                required
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Excerpt</span>
            <input
              className="app-input"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">Body</span>
            <textarea
              className="app-input min-h-[140px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publish immediately
          </label>
          <button
            type="submit"
            className="app-btn app-btn-primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Create post"}
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-sm text-muted">No posts yet.</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="app-card p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm">{post.title}</p>
                  <p className="text-xs text-muted mt-0.5">/{post.slug}</p>
                </div>
                <span className="text-xs text-muted capitalize">{post.status}</span>
              </div>
              <p className="text-sm text-muted line-clamp-2">{post.excerpt}</p>
              {canWrite ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="app-btn app-btn-secondary text-xs"
                    onClick={() => void togglePublish(post)}
                  >
                    {post.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    className="app-btn app-btn-danger text-xs"
                    onClick={() => void onDelete(post)}
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
