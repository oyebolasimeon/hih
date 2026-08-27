"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useSession } from "next-auth/react";

type RequestRow = {
  id: string;
  listingId: string;
  requesterUserId?: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  assignee: string | null;
  listingTitle: string | null;
  createdAt: string;
};

type Insight = {
  level: string;
  title: string;
  detail: string;
};

export default function MaintenanceClient() {
  const { data: session } = useSession();
  const { isLandlordLike, isTenantLike, loading: profileLoading } =
    useActiveProfile();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [listingId, setListingId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">(
    "medium"
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [rRes, iRes] = await Promise.all([
      fetch("/api/portal/maintenance"),
      fetch("/api/portal/maintenance/insights"),
    ]);
    const rData = await rRes.json();
    const iData = await iRes.json();
    setLoading(false);
    if (!rRes.ok) {
      setError(rData.error || "Unable to load maintenance.");
      return;
    }
    setRows(rData.requests || []);
    if (iRes.ok) setInsights(iData.insights || []);
    else setInsights([]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/maintenance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, title, description, priority }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create request.");
      return;
    }
    setTitle("");
    setDescription("");
    setMessage("Maintenance request submitted.");
    await load();
  }

  async function updateStatus(id: string, status: string) {
    setError("");
    const res = await fetch(`/api/portal/maintenance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed.");
      return;
    }
    await load();
  }

  if (loading || profileLoading) return <TableSkeleton rows={4} />;

  const meId = session?.user?.id || "";

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      {isLandlordLike && insights.length > 0 ? (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">Predictive insights</h2>
          <ul className="space-y-2">
            {insights.map((ins, i) => (
              <li key={`${ins.title}-${i}`} className="app-card p-4">
                <p className="text-xs uppercase tracking-wider text-muted">
                  {ins.level}
                </p>
                <p className="font-medium mt-1">{ins.title}</p>
                <p className="text-sm text-muted mt-1">{ins.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {(isTenantLike || isLandlordLike) ? (
        <form onSubmit={onCreate} className="app-card p-4 sm:p-5 space-y-4 max-w-xl">
          <h2 className="font-semibold">New maintenance request</h2>
          <p className="text-xs text-muted">
            {isLandlordLike
              ? "Log facility issues on your listings."
              : "Submit a repair request for a listing you rent."}
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5">Listing ID</label>
            <input
              className="app-input w-full"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <input
              className="app-input w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              className="app-input w-full min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Priority</label>
            <select
              className="app-input w-full"
              value={priority}
              onChange={(e) =>
                setPriority(e.target.value as "low" | "medium" | "high")
              }
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="app-btn app-btn-primary text-sm"
          >
            {saving ? "Submitting…" : "Submit request"}
          </button>
        </form>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No maintenance requests"
          description="Log plumbing, electrical, and facility issues for your homes."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const canManageStatus = isLandlordLike;
            return (
              <li key={r.id} className="app-card p-4 space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted mt-1">
                      {r.listingTitle || r.listingId} · {r.priority} · {r.status}
                      {r.assignee ? ` · ${r.assignee}` : ""}
                      {r.requesterUserId === meId ? " · you reported" : ""}
                    </p>
                  </div>
                  {canManageStatus ? (
                    <select
                      className="app-input text-xs w-auto"
                      value={r.status}
                      onChange={(e) => void updateStatus(r.id, e.target.value)}
                    >
                      <option value="open">open</option>
                      <option value="assigned">assigned</option>
                      <option value="in_progress">in_progress</option>
                      <option value="done">done</option>
                    </select>
                  ) : (
                    <span className="text-xs uppercase tracking-wider font-semibold text-muted">
                      {r.status}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted whitespace-pre-wrap">
                  {r.description}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
