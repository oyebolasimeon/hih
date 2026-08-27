"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useSession } from "next-auth/react";

type PropertyOption = {
  listingId: string;
  title: string;
  city?: string;
  role: "owner" | "tenant";
};

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
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [listingId, setListingId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignees, setAssignees] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [rRes, iRes, pRes] = await Promise.all([
      fetch("/api/portal/maintenance"),
      fetch("/api/portal/maintenance/insights"),
      fetch("/api/portal/properties"),
    ]);
    const rData = await rRes.json();
    const iData = await iRes.json();
    const pData = await pRes.json();
    setLoading(false);
    if (!rRes.ok) {
      setError(rData.error || "Unable to load service requests.");
      return;
    }
    setRows(rData.requests || []);
    if (iRes.ok) setInsights(iData.insights || []);
    else setInsights([]);
    const props = (pData.properties || []) as PropertyOption[];
    setProperties(props);
    if (!listingId && props[0]) setListingId(props[0].listingId);
  }, [listingId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setMessage("Service request submitted.");
    await load();
  }

  async function updateRequest(
    id: string,
    patch: { status?: string; assignee?: string }
  ) {
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/portal/maintenance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Update failed.");
      return;
    }
    await load();
  }

  if (loading || profileLoading) return <TableSkeleton rows={4} />;

  const meId = session?.user?.id || "";
  const propertyOptions = properties.map((p) => ({
    value: p.listingId,
    label: `${p.title}${p.city ? ` · ${p.city}` : ""}${
      p.role === "owner" ? " (yours)" : " (leased)"
    }`,
  }));

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

      {isTenantLike || isLandlordLike ? (
        <form onSubmit={onCreate} className="app-card p-4 sm:p-5 space-y-4 max-w-xl">
          <h2 className="font-semibold">New service request</h2>
          <p className="text-xs text-muted">
            {isLandlordLike
              ? "Log facility issues on your properties."
              : "Request repairs on a home you lease."}
          </p>
          {propertyOptions.length === 0 ? (
            <p className="text-sm text-muted">
              {isLandlordLike
                ? "Create a listing first."
                : "You need an active lease to open a service request."}
            </p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Property
                </label>
                <Select
                  value={listingId}
                  onChange={setListingId}
                  options={propertyOptions}
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
                  placeholder="Leaking kitchen sink"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Description
                </label>
                <textarea
                  className="app-input w-full min-h-[80px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Priority
                </label>
                <Select
                  value={priority}
                  onChange={setPriority}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "medium", label: "Medium" },
                    { value: "high", label: "High" },
                  ]}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="app-btn app-btn-primary text-sm"
              >
                {saving ? "Submitting…" : "Submit request"}
              </button>
            </>
          )}
        </form>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No service requests"
          description="Plumbing, electrical, and facility issues for leased homes appear here."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const canManage = isLandlordLike;
            return (
              <li key={r.id} className="app-card p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.title}</p>
                    <p className="text-xs text-muted mt-1">
                      {r.listingTitle || r.listingId} · {r.priority} · {r.status}
                      {r.assignee ? ` · ${r.assignee}` : ""}
                      {r.requesterUserId === meId ? " · you reported" : ""}
                    </p>
                  </div>
                  {canManage ? (
                    <select
                      className="app-input text-xs w-auto"
                      value={r.status}
                      disabled={busyId === r.id}
                      onChange={(e) =>
                        void updateRequest(r.id, { status: e.target.value })
                      }
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
                {canManage ? (
                  <div className="flex flex-wrap gap-2 items-end border-t border-border pt-3">
                    <div className="flex-1 min-w-[10rem]">
                      <label className="block text-xs text-muted mb-1">
                        Assign to
                      </label>
                      <input
                        className="app-input w-full text-sm"
                        placeholder="Technician or vendor name"
                        value={assignees[r.id] ?? r.assignee ?? ""}
                        onChange={(e) =>
                          setAssignees({ ...assignees, [r.id]: e.target.value })
                        }
                      />
                    </div>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      className="app-btn app-btn-secondary text-xs"
                      onClick={() =>
                        void updateRequest(r.id, {
                          assignee: assignees[r.id] ?? r.assignee ?? "",
                        })
                      }
                    >
                      Save assignee
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
