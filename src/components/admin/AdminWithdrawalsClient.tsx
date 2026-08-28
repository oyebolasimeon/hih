"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";

type PayoutSettings = {
  provider: "paystack" | "manual";
  withdrawalFee: number;
};

type WithdrawalRow = {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  paidAmount: number | null;
  currency: string;
  bankName: string;
  accountName: string;
  accountNumber: string | null;
  accountNumberLast4: string;
  payoutProvider: string;
  status: string;
  providerRef: string | null;
  sessionId: string | null;
  transferReceiptUrl: string | null;
  disputeStatus: string;
  disputeReason: string | null;
  adminNote: string | null;
  createdAt: string;
  completedAt: string | null;
  profileName: string;
  profileType: string;
  userEmail: string;
  userName: string;
};

function formatMoney(amount: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function statusClass(status: string) {
  if (status === "completed") return "bg-teal/15 text-brand-dark border-teal/30";
  if (status === "pending" || status === "processing") {
    return "bg-brand/10 text-brand-dark border-brand/25";
  }
  if (status === "failed") return "bg-danger/10 text-danger border-danger/30";
  return "bg-surface text-muted border-border";
}

export default function AdminWithdrawalsClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "users:write");

  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings>({
    provider: "paystack",
    withdrawalFee: 50,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [completeId, setCompleteId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [completing, setCompleting] = useState(false);
  const [busyId, setBusyId] = useState("");

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/admin/payout-settings");
    const data = await res.json();
    if (res.ok && data.payoutSettings) {
      setPayoutSettings(data.payoutSettings);
    }
  }, []);

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/withdrawals?status=${encodeURIComponent(filter)}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load withdrawals.");
      return;
    }
    setRows(data.withdrawals || []);
  }, [filter]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    void loadWithdrawals();
  }, [loadWithdrawals]);

  async function onSaveSettings(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setSavingSettings(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/payout-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payoutSettings),
    });
    const data = await res.json();
    setSavingSettings(false);
    if (!res.ok) {
      setError(data.error || "Could not save payout settings.");
      return;
    }
    setPayoutSettings(data.payoutSettings);
    setMessage("Payout settings saved.");
  }

  function openComplete(row: WithdrawalRow) {
    setCompleteId(row.id);
    setSessionId("");
    setPaidAmount(String(row.netAmount));
    setAdminNote("");
    setReceiptFile(null);
    setError("");
  }

  async function onComplete(e: FormEvent) {
    e.preventDefault();
    if (!completeId || !receiptFile) return;
    const amount = Number(paidAmount);
    if (!sessionId.trim() || !amount || amount <= 0) {
      setError("Session ID and paid amount are required.");
      return;
    }

    setCompleting(true);
    setError("");
    const form = new FormData();
    form.set("sessionId", sessionId.trim());
    form.set("paidAmount", String(amount));
    if (adminNote.trim()) form.set("adminNote", adminNote.trim());
    form.set("receipt", receiptFile);

    const res = await fetch(`/api/admin/withdrawals/${completeId}/complete`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setCompleting(false);
    if (!res.ok) {
      setError(data.error || "Could not complete withdrawal.");
      return;
    }
    setCompleteId("");
    setMessage("Withdrawal marked complete. User has been notified.");
    await loadWithdrawals();
  }

  async function resolveDispute(id: string) {
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/admin/withdrawals/${id}/dispute`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve" }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Could not resolve dispute.");
      return;
    }
    setMessage("Dispute resolved.");
    await loadWithdrawals();
  }

  return (
    <div className="space-y-8">
      <section className="app-card p-5 space-y-4">
        <h2 className="font-display text-lg font-semibold">Payout provider</h2>
        <form onSubmit={onSaveSettings} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Provider</label>
            <Select
              value={payoutSettings.provider}
              onChange={(v) =>
                setPayoutSettings((s) => ({
                  ...s,
                  provider: v as PayoutSettings["provider"],
                }))
              }
              options={[
                { value: "paystack", label: "Paystack (automated)" },
                { value: "manual", label: "Manual bank transfer" },
              ]}
              disabled={!canWrite}
            />
            <p className="text-xs text-muted mt-1">
              {payoutSettings.provider === "paystack"
                ? "Withdrawals are sent automatically via Paystack."
                : "Users see processing status; you complete transfers manually."}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Withdrawal fee (NGN)
            </label>
            <input
              type="number"
              min={0}
              className="app-input w-full"
              value={payoutSettings.withdrawalFee}
              onChange={(e) =>
                setPayoutSettings((s) => ({
                  ...s,
                  withdrawalFee: Number(e.target.value) || 0,
                }))
              }
              disabled={!canWrite}
            />
            <p className="text-xs text-muted mt-1">
              Deducted from the withdrawal amount and paid by the user.
            </p>
          </div>
          {canWrite ? (
            <div className="flex items-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="app-btn app-btn-primary text-sm"
              >
                {savingSettings ? "Saving…" : "Save settings"}
              </button>
            </div>
          ) : null}
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-56">
            <label className="block text-sm font-medium mb-1.5">Filter</label>
            <Select
              value={filter}
              onChange={setFilter}
              options={[
                { value: "pending", label: "Pending (manual)" },
                { value: "processing", label: "Processing" },
                { value: "completed", label: "Completed" },
                { value: "disputes", label: "Open disputes" },
                { value: "all", label: "All" },
              ]}
            />
          </div>
          <button
            type="button"
            onClick={() => void loadWithdrawals()}
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
        {message ? (
          <p className="text-sm text-brand-dark rounded-md border border-brand/20 bg-brand/5 px-3 py-2">
            {message}
          </p>
        ) : null}

        {loading ? (
          <TableSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="No withdrawals"
            description="Nothing matches this filter yet."
          />
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="app-card p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {formatMoney(row.amount, row.currency)} requested ·{" "}
                      {formatMoney(row.netAmount, row.currency)} net
                    </p>
                    <p className="text-sm text-muted mt-1">
                      {row.userName} ({row.userEmail}) · {row.profileName} (
                      {row.profileType})
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {row.bankName} · {row.accountName} ·{" "}
                      {row.accountNumber || row.accountNumberLast4}
                    </p>
                    <p className="text-xs text-muted">
                      {row.providerRef ? `Ref ${row.providerRef} · ` : ""}
                      {new Date(row.createdAt).toLocaleString()}
                      {row.payoutProvider === "manual" ? " · Manual" : " · Paystack"}
                    </p>
                    {row.disputeStatus === "open" && row.disputeReason ? (
                      <p className="text-xs text-danger mt-2">
                        Dispute: {row.disputeReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusClass(row.status)}`}
                    >
                      {row.status}
                    </span>
                    {row.disputeStatus === "open" ? (
                      <span className="rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-danger">
                        Dispute open
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canWrite &&
                  row.payoutProvider === "manual" &&
                  (row.status === "pending" || row.status === "processing") ? (
                    <button
                      type="button"
                      onClick={() => openComplete(row)}
                      className="app-btn app-btn-primary text-xs"
                    >
                      Complete transfer
                    </button>
                  ) : null}
                  {row.transferReceiptUrl ? (
                    <a
                      href={row.transferReceiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="app-btn app-btn-secondary text-xs"
                    >
                      Bank receipt
                    </a>
                  ) : null}
                  {canWrite && row.disputeStatus === "open" ? (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void resolveDispute(row.id)}
                      className="app-btn app-btn-secondary text-xs"
                    >
                      {busyId === row.id ? "Resolving…" : "Resolve dispute"}
                    </button>
                  ) : null}
                </div>

                {completeId === row.id ? (
                  <form
                    onSubmit={onComplete}
                    className="border-t border-border/60 pt-4 space-y-3"
                  >
                    <p className="text-sm font-medium">Complete manual transfer</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">
                          Bank session ID
                        </label>
                        <input
                          className="app-input w-full"
                          value={sessionId}
                          onChange={(e) => setSessionId(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">
                          Amount paid (NGN)
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="app-input w-full"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted mt-1">
                          Expected net: {formatMoney(row.netAmount, row.currency)} (fee{" "}
                          {formatMoney(row.fee, row.currency)})
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Transfer receipt (image or PDF)
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) =>
                          setReceiptFile(e.target.files?.[0] || null)
                        }
                        required
                        className="block w-full text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Admin note (optional)
                      </label>
                      <textarea
                        className="app-input w-full min-h-[72px]"
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={completing}
                        className="app-btn app-btn-primary text-sm"
                      >
                        {completing ? "Completing…" : "Mark complete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompleteId("")}
                        className="app-btn app-btn-secondary text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
