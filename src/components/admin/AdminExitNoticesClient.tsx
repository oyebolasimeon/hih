"use client";

import { useCallback, useEffect, useState } from "react";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";

type Notice = {
  id: string;
  listingTitle: string;
  listingCity: string;
  noticeType: string;
  reason: string;
  proposedVacateDate: string;
  status: string;
  documentNumber: string | null;
  documentUrl: string | null;
  termsText: string;
  aiRecommendation?: string | null;
  aiConfidence?: number | null;
  aiReasons: string[];
  unpaidRentDetected: boolean;
  suggestedRemainingRentRefund: number;
  remainingRentRefundAmount: number | null;
  refundStatus: string;
  tenantName: string;
  tenantEmail: string;
  landlordName: string;
  landlordEmail: string;
  createdAt: string;
};

export default function AdminExitNoticesClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "legal:write");
  const [filter, setFilter] = useState("pending_review");
  const [rows, setRows] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [refundAmounts, setRefundAmounts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs =
      filter === "refund"
        ? "refund=1"
        : filter === "all"
          ? "status=all"
          : `status=${filter}`;
    const res = await fetch(`/api/admin/exit-notices?${qs}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load exit notices.");
      return;
    }
    setRows(data.notices || []);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(
    id: string,
    action:
      | "approve_and_serve"
      | "reject"
      | "complete"
      | "refund"
      | "deny_refund"
  ) {
    setBusyId(id);
    setError("");
    const res = await fetch("/api/admin/exit-notices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        noticeId: id,
        action,
        notes: notes[id] || undefined,
        refundAmount:
          action === "refund"
            ? Number(refundAmounts[id] || 0)
            : undefined,
      }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Action failed.");
      return;
    }
    await load();
  }

  if (loading) return <TableSkeleton rows={5} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <label className="block text-sm font-medium mb-1.5">Filter</label>
          <Select
            value={filter}
            onChange={setFilter}
            options={[
              { value: "pending_review", label: "Pending review" },
              { value: "served", label: "Served" },
              { value: "acknowledged", label: "Acknowledged" },
              { value: "refund", label: "Refund queue" },
              { value: "completed", label: "Completed" },
              { value: "rejected", label: "Rejected" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No notices in this filter"
          description="Landlord exit notices and tenant early-exit requests land here after AI screening."
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((n) => (
            <li key={n.id} className="app-card p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-teal">
                    {n.status.replace(/_/g, " ")}
                    {n.aiRecommendation
                      ? ` · AI ${n.aiRecommendation}`
                      : ""}
                  </p>
                  <p className="font-display text-lg font-semibold mt-0.5">
                    {n.listingTitle || "Property"}
                    {n.listingCity ? (
                      <span className="text-sm font-normal text-muted">
                        {" "}
                        · {n.listingCity}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {n.noticeType.replace(/_/g, " ")} ·{" "}
                    {n.documentNumber || n.id.slice(-6)}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Landlord: {n.landlordName} ({n.landlordEmail}) · Tenant:{" "}
                    {n.tenantName} ({n.tenantEmail})
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Vacate{" "}
                    {new Date(n.proposedVacateDate).toLocaleDateString()} · AI:{" "}
                    {n.aiRecommendation || "—"}
                    {n.aiConfidence != null
                      ? ` (${Math.round(n.aiConfidence * 100)}%)`
                      : ""}
                    {n.unpaidRentDetected ? " · unpaid rent flagged" : ""}
                  </p>
                </div>
                <p className="text-xs text-muted">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>

              <p className="text-sm whitespace-pre-wrap">{n.reason}</p>
              {n.aiReasons?.length ? (
                <ul className="text-xs text-muted list-disc pl-4">
                  {n.aiReasons.map((r, i) => (
                    <li key={`${n.id}-ai-${i}`}>{r}</li>
                  ))}
                </ul>
              ) : null}

              <details className="text-xs">
                <summary className="cursor-pointer text-muted">
                  Legal notice draft
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-muted max-h-48 overflow-auto">
                  {n.termsText}
                </pre>
              </details>

              <p className="text-xs text-muted">
                Suggested remaining-rent refund:{" "}
                {n.suggestedRemainingRentRefund.toLocaleString()} · status:{" "}
                {n.refundStatus.replace(/_/g, " ")}
                {n.remainingRentRefundAmount != null
                  ? ` · paid ${n.remainingRentRefundAmount.toLocaleString()}`
                  : ""}
              </p>

              {canWrite ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <textarea
                    className="app-input w-full text-sm min-h-[60px]"
                    placeholder="Reviewer / legal notes"
                    value={notes[n.id] || ""}
                    onChange={(e) =>
                      setNotes({ ...notes, [n.id]: e.target.value })
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    {["pending_ai", "pending_review", "approved"].includes(
                      n.status
                    ) ? (
                      <>
                        <button
                          type="button"
                          disabled={busyId === n.id}
                          onClick={() => void act(n.id, "approve_and_serve")}
                          className="app-btn app-btn-primary text-xs"
                        >
                          Approve & serve tenant
                        </button>
                        <button
                          type="button"
                          disabled={busyId === n.id}
                          onClick={() => void act(n.id, "reject")}
                          className="app-btn app-btn-secondary text-xs"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    {["served", "acknowledged"].includes(n.status) ? (
                      <button
                        type="button"
                        disabled={busyId === n.id}
                        onClick={() => void act(n.id, "complete")}
                        className="app-btn app-btn-secondary text-xs"
                      >
                        Complete & terminate lease
                      </button>
                    ) : null}
                    {n.refundStatus === "pending_admin" ? (
                      <>
                        <input
                          className="app-input w-36 text-sm"
                          type="number"
                          min={0}
                          placeholder="Refund amount"
                          value={
                            refundAmounts[n.id] ??
                            String(n.suggestedRemainingRentRefund || 0)
                          }
                          onChange={(e) =>
                            setRefundAmounts({
                              ...refundAmounts,
                              [n.id]: e.target.value,
                            })
                          }
                        />
                        <button
                          type="button"
                          disabled={busyId === n.id}
                          onClick={() => void act(n.id, "refund")}
                          className="app-btn app-btn-primary text-xs"
                        >
                          Refund remaining rent
                        </button>
                        <button
                          type="button"
                          disabled={busyId === n.id}
                          onClick={() => void act(n.id, "deny_refund")}
                          className="app-btn app-btn-secondary text-xs"
                        >
                          Deny refund
                        </button>
                      </>
                    ) : null}
                    {n.documentUrl ? (
                      <a
                        href={n.documentUrl}
                        className="app-btn app-btn-secondary text-xs"
                        target="_blank"
                        rel="noreferrer"
                      >
                        PDF
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
