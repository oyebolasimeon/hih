"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationsClient() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/notifications");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load notifications.");
      return;
    }
    setRows(data.notifications || []);
    setUnreadCount(data.unreadCount || 0);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(ids?: string[]) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/portal/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids ? { ids } : { all: true }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not update notifications.");
      return;
    }
    await load();
  }

  if (loading) return <TableSkeleton rows={4} />;

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}
        </p>
        {unreadCount > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void markRead()}
            className="app-btn app-btn-secondary text-xs"
          >
            Mark all read
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="Application, lease, and payment alerts will appear here."
        />
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li
              key={n.id}
              className={`app-card p-4 space-y-2 ${n.read ? "opacity-70" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-muted mt-1">{n.body}</p>
                </div>
                <p className="text-xs text-muted">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {n.link ? (
                  <Link href={n.link} className="app-btn app-btn-secondary text-xs">
                    Open
                  </Link>
                ) : null}
                {!n.read ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void markRead([n.id])}
                    className="app-btn app-btn-primary text-xs"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
