"use client";

import { useCallback, useEffect, useState } from "react";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";

type FraudRow = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string;
  status: string;
  reporterName: string;
  reporterEmail: string;
  createdAt: string;
};

export default function AdminFraudClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "fraud:write");
  const [filter, setFilter] = useState("open");
  const [rows, setRows] = useState<FraudRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = filter === "all" ? "status=all" : `status=${filter}`;
    const res = await fetch(`/api/admin/fraud?${qs}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load fraud reports.");
      return;
    }
    setRows(data.reports || []);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(
    id: string,
    status: "open" | "reviewing" | "resolved" | "dismissed"
  ) {
    setBusyId(id);
    setError("");
    const res = await fetch("/api/admin/fraud", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: id, status }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Update failed.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <label className="block text-sm font-medium mb-1.5">Filter</label>
          <Select
            value={filter}
            onChange={setFilter}
            options={[
              { value: "open", label: "Open" },
              { value: "reviewing", label: "Reviewing" },
              { value: "resolved", label: "Resolved" },
              { value: "dismissed", label: "Dismissed" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="app-btn app-btn-secondary text-xs"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <TableSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No fraud reports"
          description="User-submitted reports about listings, profiles, or users appear here."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="app-card p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {r.targetType} · {r.status}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Target {r.targetId} · reported by {r.reporterName || r.reporterEmail}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  {new Date(r.createdAt).toLocaleString()}
                </p>
              </div>
              <p className="text-sm">{r.reason}</p>
              {r.details ? (
                <p className="text-xs text-muted whitespace-pre-wrap">{r.details}</p>
              ) : null}
              {canWrite ? (
                <div className="flex flex-wrap gap-2">
                  {(
                    ["reviewing", "resolved", "dismissed", "open"] as const
                  ).map((s) =>
                    s === r.status ? null : (
                      <button
                        key={s}
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => void updateStatus(r.id, s)}
                        className="app-btn app-btn-secondary text-xs"
                      >
                        Mark {s}
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
