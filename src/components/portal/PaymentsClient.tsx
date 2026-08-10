"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

type PaymentRow = {
  id: string;
  leaseId: string | null;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerRef: string | null;
  receiptUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  leaseStatus: string | null;
};

type AgreementOption = {
  id: string;
  status: string;
  rentAmount: number;
  currency: string;
  listing: { title: string } | null;
};

export default function PaymentsClient() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [leases, setLeases] = useState<AgreementOption[]>([]);
  const [leaseId, setLeaseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [pRes, aRes] = await Promise.all([
      fetch("/api/portal/payments"),
      fetch("/api/portal/agreements"),
    ]);
    const pData = await pRes.json();
    const aData = await aRes.json();
    setLoading(false);
    if (!pRes.ok) {
      setError(pData.error || "Unable to load payments.");
      return;
    }
    setRows(pData.payments || []);
    const active = (aData.agreements || []).filter(
      (a: AgreementOption) => a.status === "active"
    );
    setLeases(active);
    if (!leaseId && active[0]?.id) setLeaseId(active[0].id);
  }, [leaseId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const paid = searchParams.get("paid");
    const mockRef = searchParams.get("mock_ref");
    const ref = mockRef || searchParams.get("reference");
    if (paid === "1" && ref) {
      void (async () => {
        setVerifying(true);
        setError("");
        const res = await fetch(
          `/api/portal/payments/verify?reference=${encodeURIComponent(ref)}`
        );
        const data = await res.json();
        setVerifying(false);
        if (!res.ok) {
          setError(data.error || "Could not verify payment.");
          return;
        }
        setMessage("Payment verified successfully.");
        await load();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function onPay(e: FormEvent) {
    e.preventDefault();
    if (!leaseId) {
      setError("Select an active lease.");
      return;
    }
    setPaying(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaseId }),
    });
    const data = await res.json();
    setPaying(false);
    if (!res.ok) {
      setError(data.error || "Could not start payment.");
      return;
    }
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
      return;
    }
    setMessage("Payment initialized.");
    await load();
  }

  if (loading) return <TableSkeleton rows={4} />;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}
      {verifying ? (
        <p className="text-sm text-muted">Verifying payment…</p>
      ) : null}

      <form onSubmit={onPay} className="app-card p-4 sm:p-5 space-y-4 max-w-xl">
        <h2 className="font-semibold">Pay rent</h2>
        <p className="text-xs text-muted">
          Paystack (or mock mode) for active leases where you are the tenant.
        </p>
        {leases.length === 0 ? (
          <p className="text-sm text-muted">
            No active leases. Complete signatures first.
          </p>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium mb-1.5">Lease</label>
              <select
                className="app-input w-full"
                value={leaseId}
                onChange={(e) => setLeaseId(e.target.value)}
              >
                {leases.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.listing?.title || "Lease"} · {l.currency}{" "}
                    {l.rentAmount.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={paying}
              className="app-btn app-btn-primary text-sm"
            >
              {paying ? "Redirecting…" : "Pay with Paystack"}
            </button>
          </>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title="No payments yet"
          description="Rent payments you make or receive will show up here."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => (
            <li key={p.id} className="app-card p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {p.currency} {p.amount.toLocaleString()} · {p.status}
                </p>
                <p className="text-xs text-muted mt-1">
                  {p.provider}
                  {p.providerRef ? ` · ${p.providerRef}` : ""}
                  {p.paidAt
                    ? ` · paid ${new Date(p.paidAt).toLocaleString()}`
                    : ` · ${new Date(p.createdAt).toLocaleString()}`}
                </p>
              </div>
              {p.receiptUrl ? (
                <a
                  href={p.receiptUrl}
                  className="app-btn app-btn-secondary text-xs"
                >
                  Receipt
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
