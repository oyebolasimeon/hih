"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useActiveProfile } from "@/hooks/useActiveProfile";

type LeaseOption = {
  id: string;
  status: string;
  listing: { title?: string; city?: string } | null;
  viewerRole: string | null;
};

type NoticeRow = {
  id: string;
  noticeType: string;
  reason: string;
  proposedVacateDate: string;
  status: string;
  documentNumber: string | null;
  documentUrl: string | null;
  aiRecommendation?: string | null;
  unpaidRentDetected?: boolean;
  refundStatus?: string;
  viewerRole?: string;
  listing?: { title?: string; city?: string; state?: string } | null;
  termsText?: string;
};

export default function ExitNoticesClient() {
  const { isLandlordLike, isTenantLike, loading: profileLoading } =
    useActiveProfile();
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [leases, setLeases] = useState<LeaseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [leaseId, setLeaseId] = useState("");
  const [noticeType, setNoticeType] = useState("landlord_quit");
  const [reason, setReason] = useState("");
  const [vacateDate, setVacateDate] = useState("");
  const [ackOk, setAckOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [nRes, aRes] = await Promise.all([
      fetch("/api/portal/exit-notices"),
      fetch("/api/portal/agreements"),
    ]);
    const nData = await nRes.json();
    const aData = await aRes.json();
    setLoading(false);
    if (!nRes.ok) {
      setError(nData.error || "Unable to load exit notices.");
      return;
    }
    setNotices(nData.notices || []);
    const active = ((aData.leases || []) as LeaseOption[]).filter(
      (l) => l.status === "active"
    );
    setLeases(active);
    if (!leaseId && active[0]) setLeaseId(active[0].id);
  }, [leaseId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isTenantLike && !isLandlordLike) {
      setNoticeType("tenant_early_exit");
    } else if (isLandlordLike) {
      setNoticeType("landlord_quit");
    }
  }, [isTenantLike, isLandlordLike]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/exit-notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaseId,
        noticeType,
        reason,
        proposedVacateDate: vacateDate,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not submit exit notice.");
      return;
    }
    setReason("");
    setMessage(
      isLandlordLike
        ? "Exit notice submitted. House In Hands AI + legal/ops must approve before it is served to the tenant."
        : "Early exit request submitted for AI + legal/ops review."
    );
    await load();
  }

  async function acknowledge(id: string) {
    if (!ackOk) {
      setError("Confirm acknowledgement before continuing.");
      return;
    }
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/portal/exit-notices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "acknowledge", acknowledged: true }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Could not acknowledge.");
      return;
    }
    setMessage("Exit notice acknowledged.");
    await load();
  }

  async function cancel(id: string) {
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/portal/exit-notices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Could not cancel.");
      return;
    }
    await load();
  }

  if (loading || profileLoading) return <TableSkeleton rows={4} />;

  const leaseOptions = leases.map((l) => ({
    value: l.id,
    label: `${l.listing?.title || "Lease"}${
      l.listing?.city ? ` · ${l.listing.city}` : ""
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

      {(isLandlordLike || isTenantLike) && leaseOptions.length > 0 ? (
        <form onSubmit={onCreate} className="app-card p-4 sm:p-5 space-y-4 max-w-xl">
          <h2 className="font-semibold">
            {isLandlordLike ? "Issue exit / vacate notice" : "Request early exit"}
          </h2>
          <p className="text-xs text-muted">
            Notices are screened by House In Hands AI and reviewed by legal/ops
            against your tenancy agreement before a tenant is served. Remaining
            rent refunds (if any) are decided by admin/legal.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5">Lease</label>
            <Select
              value={leaseId}
              onChange={setLeaseId}
              options={leaseOptions}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <Select
              value={noticeType}
              onChange={setNoticeType}
              options={
                isLandlordLike
                  ? [
                      { value: "landlord_quit", label: "Notice to quit / vacate" },
                      { value: "mutual", label: "Mutual early termination" },
                      { value: "expiry", label: "End of term / expiry" },
                    ]
                  : [
                      {
                        value: "tenant_early_exit",
                        label: "Tenant early exit request",
                      },
                      { value: "mutual", label: "Propose mutual termination" },
                    ]
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Proposed vacate date
            </label>
            <input
              type="date"
              className="app-input w-full"
              value={vacateDate}
              onChange={(e) => setVacateDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Reason (per agreement)
            </label>
            <textarea
              className="app-input w-full min-h-[100px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={10}
              placeholder="Reference the clause or situation in your tenancy agreement…"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="app-btn app-btn-primary text-sm"
          >
            {saving ? "Submitting…" : "Submit for AI + legal review"}
          </button>
        </form>
      ) : null}

      <div>
        <h2 className="font-semibold mb-3">Your exit notices</h2>
        {notices.length === 0 ? (
          <EmptyState
            title="No exit notices"
            description={
              isTenantLike
                ? "Served notices and your early-exit requests appear here. Until legal/ops serves a landlord notice, it stays hidden."
                : "Submitted notices await AI + human review before they are served."
            }
          >
            <Link href="/portal/home" className="app-btn app-btn-secondary text-sm">
              My Home
            </Link>
          </EmptyState>
        ) : (
          <ul className="space-y-3">
            {notices.map((n) => (
              <li key={n.id} className="app-card p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {n.listing?.title || "Property"} ·{" "}
                      {n.noticeType.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      Status: {n.status.replace(/_/g, " ")}
                      {n.documentNumber ? ` · ${n.documentNumber}` : ""}
                      {n.aiRecommendation
                        ? ` · AI: ${n.aiRecommendation}`
                        : ""}
                      {n.unpaidRentDetected ? " · unpaid rent flagged" : ""}
                      {n.refundStatus && n.refundStatus !== "none"
                        ? ` · refund: ${n.refundStatus.replace(/_/g, " ")}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      Vacate{" "}
                      {new Date(n.proposedVacateDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted whitespace-pre-wrap line-clamp-4">
                  {n.reason}
                </p>
                <div className="flex flex-wrap gap-2">
                  {n.documentUrl &&
                  ["served", "acknowledged", "completed"].includes(n.status) ? (
                    <a
                      href={n.documentUrl}
                      className="app-btn app-btn-secondary text-xs"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Legal PDF
                    </a>
                  ) : null}
                  {n.viewerRole === "tenant" && n.status === "served" ? (
                    <>
                      <Checkbox
                        checked={ackOk}
                        onChange={setAckOk}
                        label="I acknowledge this served exit notice"
                      />
                      <button
                        type="button"
                        disabled={busyId === n.id || !ackOk}
                        onClick={() => void acknowledge(n.id)}
                        className="app-btn app-btn-primary text-xs disabled:opacity-50"
                      >
                        Acknowledge
                      </button>
                    </>
                  ) : null}
                  {["pending_ai", "pending_review"].includes(n.status) ? (
                    <button
                      type="button"
                      disabled={busyId === n.id}
                      onClick={() => void cancel(n.id)}
                      className="app-btn app-btn-secondary text-xs"
                    >
                      Cancel request
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
