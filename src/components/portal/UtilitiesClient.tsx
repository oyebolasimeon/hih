"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

type Bill = {
  id: string;
  category: string;
  provider: string;
  accountNumber: string;
  amount: number;
  currency: string;
  status: string;
  providerRef: string | null;
  paidAt: string | null;
  createdAt: string;
};

const CATEGORIES = [
  "electricity",
  "water",
  "waste",
  "estate_dues",
  "internet",
  "cable",
] as const;

export default function UtilitiesClient() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("electricity");
  const [provider, setProvider] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/utilities");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load bills.");
      return;
    }
    setBills(data.bills || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/utilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        provider,
        accountNumber,
        amount: Number(amount),
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create bill.");
      return;
    }
    setProvider("");
    setAccountNumber("");
    setAmount("");
    setMessage("Bill intent created.");
    await load();
  }

  async function onPay(id: string) {
    setPayingId(id);
    setError("");
    setMessage("");
    const res = await fetch(`/api/portal/utilities/${id}/pay`, {
      method: "POST",
    });
    const data = await res.json();
    setPayingId(null);
    if (!res.ok) {
      setError(data.error || "Payment failed.");
      return;
    }
    setMessage(
      data.bill?.mock
        ? "Marked paid (mock Paystack)."
        : "Utility bill paid."
    );
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

      <form onSubmit={onCreate} className="app-card p-4 sm:p-5 space-y-4 max-w-xl">
        <h2 className="font-semibold">Pay a utility bill</h2>
        <div>
          <label className="block text-sm font-medium mb-1.5">Category</label>
          <select
            className="app-input w-full"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as (typeof CATEGORIES)[number])
            }
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Provider</label>
          <input
            className="app-input w-full"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            placeholder="e.g. Ikeja Electric"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Account / meter number
          </label>
          <input
            className="app-input w-full"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Amount (NGN)</label>
          <input
            type="number"
            min={1}
            className="app-input w-full"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="app-btn app-btn-primary text-sm"
        >
          {saving ? "Creating…" : "Create bill"}
        </button>
      </form>

      {bills.length === 0 ? (
        <EmptyState
          title="No utility bills"
          description="Create a bill intent to pay electricity, water, and other estate dues."
        />
      ) : (
        <ul className="space-y-3">
          {bills.map((b) => (
            <li
              key={b.id}
              className="app-card p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium capitalize">
                  {b.category.replace("_", " ")} · {b.provider}
                </p>
                <p className="text-xs text-muted mt-1">
                  {b.currency} {b.amount.toLocaleString()} · {b.status}
                  {b.accountNumber ? ` · ${b.accountNumber}` : ""}
                </p>
              </div>
              {b.status === "pending" ? (
                <button
                  type="button"
                  disabled={payingId === b.id}
                  onClick={() => void onPay(b.id)}
                  className="app-btn app-btn-primary text-xs"
                >
                  {payingId === b.id ? "Paying…" : "Pay now"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
