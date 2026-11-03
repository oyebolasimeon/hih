"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO, startOfMonth } from "date-fns";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import DateField from "@/components/ui/DateField";
import Calendar, { type CalendarEvent } from "@/components/ui/Calendar";
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

function todayIso() {
  return format(new Date(), "yyyy-MM-dd");
}

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
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

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

  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      notices.map((n) => ({
        id: n.id,
        title: n.listing?.title || "Exit",
        startDate: n.proposedVacateDate,
        endDate: n.proposedVacateDate,
        tone:
          n.status === "served" || n.status === "acknowledged"
            ? "warn"
            : n.status === "completed"
              ? "muted"
              : "brand",
        meta: n.status.replace(/_/g, " "),
      })),
    [notices]
  );

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
    setVacateDate("");
    setMessage(
      isLandlordLike
        ? "Exit notice submitted. AI + legal/ops must approve before it is served to the tenant."
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
    setAckOk(false);
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

      <div className="grid lg:grid-cols-5 gap-5">
        {(isLandlordLike || isTenantLike) && leaseOptions.length > 0 ? (
          <form
            onSubmit={onCreate}
            className="lg:col-span-2 app-card p-4 sm:p-5 space-y-4 h-fit"
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
                New request
              </p>
              <h2 className="mt-1 font-display text-xl font-semibold">
                {isLandlordLike
                  ? "Issue exit / vacate notice"
                  : "Request early exit"}
              </h2>
              <p className="mt-1 text-xs text-muted">
                Screened by AI and reviewed by legal/ops against your tenancy
                agreement before a tenant is served.
              </p>
            </div>

            <Select
              label="Lease"
              value={leaseId}
              onChange={setLeaseId}
              options={leaseOptions}
              required
            />
            <Select
              label="Notice type"
              value={noticeType}
              onChange={setNoticeType}
              options={
                isLandlordLike
                  ? [
                      {
                        value: "landlord_quit",
                        label: "Notice to quit / vacate",
                      },
                      {
                        value: "mutual",
                        label: "Mutual early termination",
                      },
                      { value: "expiry", label: "End of term / expiry" },
                    ]
                  : [
                      {
                        value: "tenant_early_exit",
                        label: "Tenant early exit request",
                      },
                      {
                        value: "mutual",
                        label: "Propose mutual termination",
                      },
                    ]
              }
            />
            <DateField
              label="Proposed vacate date"
              value={vacateDate}
              onChange={setVacateDate}
              min={todayIso()}
              required
              helpText="Pick the day you expect the tenancy to end."
            />
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Reason (per agreement)
              </label>
              <textarea
                className="app-input w-full min-h-[110px]"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={10}
                placeholder="Reference the clause or situation in your tenancy agreement…"
              />
            </div>
            <button
              type="submit"
              disabled={saving || !vacateDate}
              className="app-btn app-btn-primary text-sm w-full sm:w-auto disabled:opacity-50"
            >
              {saving ? "Submitting…" : "Submit for AI + legal review"}
            </button>
          </form>
        ) : (
          <div className="lg:col-span-2">
            <EmptyState
              title="No active lease"
              description="Exit notices need an active signed lease."
            >
              <Link
                href="/portal/agreements"
                className="app-btn app-btn-secondary text-sm"
              >
                Open agreements
              </Link>
            </EmptyState>
          </div>
        )}

        <div className="lg:col-span-3 space-y-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Vacate calendar</h2>
            <p className="text-xs text-muted">
              Proposed and served vacate dates on your notices
            </p>
          </div>
          <Calendar
            month={month}
            onMonthChange={setMonth}
            events={calendarEvents}
            selectedDay={vacateDate ? parseISO(vacateDate) : null}
            onDayClick={(day) => {
              const iso = format(day, "yyyy-MM-dd");
              if (iso >= todayIso()) setVacateDate(iso);
            }}
          />
        </div>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold mb-3">
          Your exit notices
        </h2>
        {notices.length === 0 ? (
          <EmptyState
            title="No exit notices"
            description={
              isTenantLike
                ? "Served notices and your early-exit requests appear here."
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
                      {n.listing?.title || "Property"}
                    </p>
                    <p className="text-xs text-muted mt-1 capitalize">
                      {n.noticeType.replace(/_/g, " ")} ·{" "}
                      {n.status.replace(/_/g, " ")}
                      {n.documentNumber ? ` · ${n.documentNumber}` : ""}
                      {n.aiRecommendation
                        ? ` · AI: ${n.aiRecommendation}`
                        : ""}
                    </p>
                    <p className="text-sm mt-2">
                      Vacate{" "}
                      <span className="font-medium">
                        {new Date(n.proposedVacateDate).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                  <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {n.refundStatus && n.refundStatus !== "none"
                      ? `Refund · ${n.refundStatus.replace(/_/g, " ")}`
                      : n.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-sm text-muted whitespace-pre-wrap line-clamp-4">
                  {n.reason}
                </p>
                <div className="flex flex-wrap gap-2 items-center">
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
                    <div className="w-full space-y-3 pt-1">
                      <Checkbox
                        checked={ackOk}
                        onChange={setAckOk}
                        label="I acknowledge this served exit notice"
                        variant="card"
                      />
                      <button
                        type="button"
                        disabled={busyId === n.id || !ackOk}
                        onClick={() => void acknowledge(n.id)}
                        className="app-btn app-btn-primary text-xs disabled:opacity-50"
                      >
                        Acknowledge receipt
                      </button>
                    </div>
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
