"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  currency: string;
  cadence: string;
  status: string;
};

export default function SavingsClient() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [depositingId, setDepositingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [cadence, setCadence] = useState<"weekly" | "monthly">("monthly");
  const [depositAmounts, setDepositAmounts] = useState<Record<string, string>>(
    {}
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/savings");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load savings.");
      return;
    }
    setGoals(data.goals || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/savings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        targetAmount: Number(targetAmount),
        cadence,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create goal.");
      return;
    }
    setTitle("");
    setTargetAmount("");
    setMessage("Savings goal created.");
    await load();
  }

  async function onDeposit(id: string) {
    const amount = Number(depositAmounts[id] || 0);
    if (!amount || amount <= 0) {
      setError("Enter a deposit amount.");
      return;
    }
    setDepositingId(id);
    setError("");
    setMessage("");
    const res = await fetch(`/api/portal/savings/${id}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    setDepositingId(null);
    if (!res.ok) {
      setError(data.error || "Deposit failed.");
      return;
    }
    setDepositAmounts((prev) => ({ ...prev, [id]: "" }));
    setMessage(
      data.goal?.status === "completed"
        ? "Goal completed — well done!"
        : "Deposit recorded."
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
        <h2 className="font-semibold">New savings goal</h2>
        <div>
          <label className="block text-sm font-medium mb-1.5">Title</label>
          <input
            className="app-input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Rent for May"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Target amount (NGN)
          </label>
          <input
            type="number"
            min={1}
            className="app-input w-full"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Cadence</label>
          <select
            className="app-input w-full"
            value={cadence}
            onChange={(e) =>
              setCadence(e.target.value as "weekly" | "monthly")
            }
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="app-btn app-btn-primary text-sm"
        >
          {saving ? "Saving…" : "Create goal"}
        </button>
      </form>

      {goals.length === 0 ? (
        <EmptyState
          title="No savings goals"
          description="Set a rent or deposit target and track weekly or monthly progress."
        />
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => {
            const pct = Math.min(
              100,
              Math.round((g.savedAmount / g.targetAmount) * 100)
            );
            return (
              <li key={g.id} className="app-card p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">{g.title}</p>
                    <p className="text-xs text-muted mt-1">
                      {g.currency} {g.savedAmount.toLocaleString()} /{" "}
                      {g.targetAmount.toLocaleString()} · {g.cadence} ·{" "}
                      {g.status}
                    </p>
                  </div>
                  <span className="text-sm font-medium">{pct}%</span>
                </div>
                <div className="h-2 rounded bg-surface-dark overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {g.status === "active" ? (
                  <div className="flex flex-wrap gap-2 items-end">
                    <div>
                      <label className="block text-xs text-muted mb-1">
                        Deposit (NGN)
                      </label>
                      <input
                        type="number"
                        min={1}
                        className="app-input w-36"
                        value={depositAmounts[g.id] || ""}
                        onChange={(e) =>
                          setDepositAmounts((prev) => ({
                            ...prev,
                            [g.id]: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <button
                      type="button"
                      disabled={depositingId === g.id}
                      onClick={() => void onDeposit(g.id)}
                      className="app-btn app-btn-secondary text-xs"
                    >
                      {depositingId === g.id ? "Saving…" : "Add deposit"}
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
