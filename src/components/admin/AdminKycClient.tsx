"use client";

import { useCallback, useEffect, useState } from "react";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";

type Submission = {
  id: string;
  profileType: string;
  status: string;
  requiresManualReview: boolean;
  ninMasked?: string;
  bvnMasked?: string;
  selfieUrl?: string;
  documents: { kind: string; url: string; filename?: string }[];
  checks: {
    type: string;
    status: string;
    message?: string;
    confidence?: number;
    faceMatched?: boolean;
  }[];
  failureReason?: string;
  userName: string;
  userEmail: string;
  createdAt: string;
};

export default function AdminKycClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "kyc:write");
  const [filter, setFilter] = useState("pending");
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs =
      filter === "manual"
        ? "manual=1"
        : filter === "all"
          ? "status=all"
          : `status=${filter}`;
    const res = await fetch(`/api/admin/kyc?${qs}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load KYC queue.");
      return;
    }
    setRows(data.submissions || []);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    setError("");
    const res = await fetch("/api/admin/kyc", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId: id,
        decision,
        notes: notes[id] || undefined,
      }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Review failed.");
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
              { value: "pending", label: "Pending" },
              { value: "manual", label: "Needs manual review" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "failed", label: "Failed (Prembly)" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
        <button
          type="button"
          className="app-btn app-btn-secondary text-xs"
          onClick={() => void load()}
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
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No submissions"
          description="Nothing in this filter. New Prembly KYC submissions will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((s) => (
            <li key={s.id} className="app-card p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold capitalize">
                    {s.profileType.replace("_", " ")} · {s.status}
                  </p>
                  <p className="text-sm text-muted">
                    {s.userName} · {s.userEmail}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {new Date(s.createdAt).toLocaleString()}
                    {s.ninMasked ? ` · NIN ${s.ninMasked}` : ""}
                    {s.bvnMasked ? ` · BVN ${s.bvnMasked}` : ""}
                  </p>
                </div>
                {s.requiresManualReview ? (
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-brand">
                    Manual review
                  </span>
                ) : null}
              </div>

              {s.selfieUrl ? (
                <div className="flex gap-3 items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.selfieUrl}
                    alt="Selfie"
                    className="h-20 w-20 rounded object-cover border border-border"
                  />
                  <ul className="text-xs text-muted space-y-1 flex-1">
                    {s.checks.map((c, i) => (
                      <li key={`${c.type}-${i}`}>
                        <span className="text-foreground font-medium">{c.type}</span>:{" "}
                        {c.status}
                        {c.faceMatched != null
                          ? c.faceMatched
                            ? " · face match"
                            : " · face mismatch"
                          : ""}
                        {c.confidence != null
                          ? ` · ${(c.confidence * 100).toFixed(0)}%`
                          : ""}
                        {c.message ? ` — ${c.message}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {s.documents?.length ? (
                <div className="text-xs space-y-1">
                  {s.documents.map((d) => (
                    <a
                      key={d.url}
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-dark underline"
                    >
                      {d.kind}
                      {d.filename ? `: ${d.filename}` : ""}
                    </a>
                  ))}
                </div>
              ) : null}

              {s.failureReason ? (
                <p className="text-xs text-danger">{s.failureReason}</p>
              ) : null}

              {canWrite && s.status === "pending" ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <textarea
                    className="app-input w-full text-sm min-h-[72px]"
                    placeholder="Reviewer notes (optional)"
                    value={notes[s.id] || ""}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [s.id]: e.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      className="app-btn app-btn-primary text-xs"
                      onClick={() => void review(s.id, "approve")}
                    >
                      Approve profile
                    </button>
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      className="app-btn app-btn-secondary text-xs"
                      onClick={() => void review(s.id, "reject")}
                    >
                      Reject
                    </button>
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
