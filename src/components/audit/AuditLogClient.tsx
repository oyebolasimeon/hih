"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Select from "@/components/ui/Select";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

type AuditChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

type AuditRow = {
  id: string;
  action: string;
  summary: string;
  actorEmail: string;
  actorName: string;
  actorKind: string;
  entityType: string;
  entityId: string;
  investorId: string | null;
  investorVisible: boolean;
  changes: AuditChange[];
  metadata: Record<string, unknown>;
  ip: string;
  userAgent: string;
  requestPath: string;
  createdAt: string;
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AuditLogClient({
  title = "Audit log",
  subtitle = "Every write and auth action across investors and admins.",
  apiPath = "/api/admin/audit",
  showAdminFilters = true,
}: {
  title?: string;
  subtitle?: string;
  apiPath?: string;
  showAdminFilters?: boolean;
}) {
  const searchParams = useSearchParams();
  const investorIdFromUrl = searchParams.get("investorId") || "";
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("all");
  const [actorKind, setActorKind] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "40");
    if (showAdminFilters) {
      if (q.trim()) params.set("q", q.trim());
      if (action !== "all") params.set("action", action);
      if (actorKind !== "all") params.set("actorKind", actorKind);
      if (investorIdFromUrl) params.set("investorId", investorIdFromUrl);
    }
    const res = await fetch(`${apiPath}?${params}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load audit log.");
      return;
    }
    setLogs(data.logs || []);
    setTotal(data.total || 0);
  }, [apiPath, page, q, action, actorKind, showAdminFilters, investorIdFromUrl]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    void load();
  }

  const totalPages = Math.max(1, Math.ceil(total / 40));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">{subtitle}</p>
        {showAdminFilters && investorIdFromUrl ? (
          <p className="mt-2 text-xs text-brand font-medium">
            Filtered to investor #{investorIdFromUrl.slice(-8)}
          </p>
        ) : null}
      </div>

      {showAdminFilters ? (
        <form
          onSubmit={onSearch}
          className="flex flex-col lg:flex-row gap-3 max-w-4xl"
        >
          <input
            className="app-input"
            placeholder="Search summary, actor, action…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select
            className="lg:w-44"
            value={actorKind}
            onChange={setActorKind}
            options={[
              { value: "all", label: "All actors" },
              { value: "admin", label: "Admins" },
              { value: "investor", label: "Investors" },
              { value: "anonymous", label: "Anonymous" },
              { value: "system", label: "System" },
            ]}
          />
          <Select
            className="lg:w-52"
            value={action}
            onChange={setAction}
            options={[
              { value: "all", label: "All actions" },
              { value: "auth.login", label: "auth.login" },
              { value: "auth.logout", label: "auth.logout" },
              { value: "auth.register", label: "auth.register" },
              { value: "user.update", label: "user.update" },
              { value: "investor.update", label: "investor.update" },
              { value: "property.create", label: "property.create" },
              { value: "property.update", label: "property.update" },
              { value: "booking.create", label: "booking.create" },
              { value: "admin.invite", label: "admin.invite" },
            ]}
          />
          <button type="submit" className="app-btn app-btn-secondary">
            Search
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <>
          <PageHeaderSkeleton />
          <TableSkeleton rows={8} cols={4} />
        </>
      ) : logs.length === 0 ? (
        <EmptyState
          title="No audit events yet"
          description="Actions appear here as people sign in, update profiles, and change portfolio data."
        />
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            {total} event{total === 1 ? "" : "s"} · page {page} of {totalPages}
          </p>
          {logs.map((log) => {
            const open = expanded === log.id;
            return (
              <div key={log.id} className="app-card overflow-hidden">
                <button
                  type="button"
                  className="w-full text-left px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 hover:bg-surface/60 transition-colors"
                  onClick={() => setExpanded(open ? null : log.id)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{log.summary}</p>
                    <p className="mt-1 text-xs text-muted">
                      <span className="font-mono">{log.action}</span>
                      {" · "}
                      {log.actorName || log.actorEmail || "Unknown"}
                      {log.actorKind ? ` (${log.actorKind})` : ""}
                      {log.entityType
                        ? ` · ${log.entityType}${log.entityId ? ` #${log.entityId.slice(-6)}` : ""}`
                        : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs text-muted sm:text-right">
                    <p>{formatWhen(log.createdAt)}</p>
                    <p className="mt-0.5 text-brand">
                      {open ? "Hide details" : "View details"}
                    </p>
                  </div>
                </button>

                {open ? (
                  <div className="border-t border-border bg-surface/40 px-4 py-4 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted uppercase tracking-wider">
                          Initiated by
                        </p>
                        <p className="mt-1 font-medium">
                          {log.actorName || "—"} {log.actorEmail ? `<${log.actorEmail}>` : ""}
                        </p>
                        <p className="text-muted capitalize">{log.actorKind}</p>
                      </div>
                      {showAdminFilters ? (
                        <div>
                          <p className="text-muted uppercase tracking-wider">
                            Request
                          </p>
                          <p className="mt-1 break-all">{log.requestPath || "—"}</p>
                          <p className="text-muted break-all">
                            {log.ip || "no ip"}
                            {log.userAgent ? ` · ${log.userAgent.slice(0, 80)}` : ""}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    {log.changes?.length ? (
                      <div className="overflow-x-auto rounded-md border border-border">
                        <table className="w-full text-xs">
                          <thead className="bg-surface text-left text-muted">
                            <tr>
                              <th className="px-3 py-2 font-medium">Field</th>
                              <th className="px-3 py-2 font-medium">Old value</th>
                              <th className="px-3 py-2 font-medium">New value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {log.changes.map((c, i) => (
                              <tr
                                key={`${c.field}-${i}`}
                                className="border-t border-border align-top"
                              >
                                <td className="px-3 py-2 font-mono font-medium">
                                  {c.field}
                                </td>
                                <td className="px-3 py-2 whitespace-pre-wrap text-muted max-w-xs">
                                  {formatValue(c.oldValue)}
                                </td>
                                <td className="px-3 py-2 whitespace-pre-wrap max-w-xs">
                                  {formatValue(c.newValue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-xs text-muted">
                        No field-level changes recorded for this event.
                      </p>
                    )}

                    {showAdminFilters &&
                    log.metadata &&
                    Object.keys(log.metadata).length > 0 ? (
                      <pre className="text-[11px] overflow-x-auto rounded-md border border-border bg-background p-3 text-muted">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              className="app-btn app-btn-secondary text-xs"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="app-btn app-btn-secondary text-xs"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
