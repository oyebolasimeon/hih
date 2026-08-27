"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { StatCardsSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  currency: string;
  cadence: string;
  status: string;
  createdAt?: string;
};

type FilterTab = "all" | "active" | "completed";

const GOAL_TEMPLATES = [
  {
    title: "Rent fund",
    hint: "Save ahead for upcoming rent",
    cadence: "monthly" as const,
  },
  {
    title: "Security deposit",
    hint: "One-time deposit for your next lease",
    cadence: "monthly" as const,
  },
  {
    title: "Agent & agreement fees",
    hint: "Cover agency and legal costs",
    cadence: "monthly" as const,
  },
  {
    title: "Moving & setup",
    hint: "Furniture, utilities, and move-in costs",
    cadence: "weekly" as const,
  },
];

const QUICK_DEPOSITS = [5_000, 10_000, 25_000, 50_000];

const CADENCE_OPTIONS = [
  { value: "monthly", label: "Monthly contributions" },
  { value: "weekly", label: "Weekly contributions" },
];

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

function progressPct(saved: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((saved / target) * 100));
}

function statusLabel(status: string) {
  if (status === "completed") return "Completed";
  if (status === "paused") return "Paused";
  return "Active";
}

function statusClass(status: string) {
  if (status === "completed") {
    return "bg-teal/15 text-brand-dark border-teal/30";
  }
  if (status === "paused") {
    return "bg-surface text-muted border-border";
  }
  return "bg-brand/10 text-brand-dark border-brand/25";
}

function cadenceLabel(cadence: string) {
  return cadence === "weekly" ? "Weekly" : "Monthly";
}

export default function SavingsClient() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [depositingId, setDepositingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

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

  const stats = useMemo(() => {
    const active = goals.filter((g) => g.status === "active");
    const completed = goals.filter((g) => g.status === "completed");
    const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
    const totalTarget = active.reduce((sum, g) => sum + g.targetAmount, 0);
    return {
      totalSaved,
      totalTarget,
      activeCount: active.length,
      completedCount: completed.length,
    };
  }, [goals]);

  const filteredGoals = useMemo(() => {
    if (filter === "active") return goals.filter((g) => g.status === "active");
    if (filter === "completed") {
      return goals.filter((g) => g.status === "completed");
    }
    return goals;
  }, [goals, filter]);

  function applyTemplate(template: (typeof GOAL_TEMPLATES)[number]) {
    setTitle(template.title);
    setCadence(template.cadence);
    setTargetAmount("");
    setShowCreate(true);
  }

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
    setCadence("monthly");
    setShowCreate(false);
    setMessage("Savings goal created.");
    await load();
  }

  async function onDeposit(id: string, preset?: number) {
    const amount = preset ?? Number(depositAmounts[id] || 0);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <StatCardsSkeleton count={3} />
        <TableSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
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

      <section className="grid sm:grid-cols-3 gap-3">
        <Reveal>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Total saved
            </p>
            <p className="mt-2 text-2xl font-display font-semibold">
              {formatMoney(stats.totalSaved)}
            </p>
            {stats.totalTarget > 0 ? (
              <p className="mt-1 text-xs text-muted">
                {formatMoney(stats.totalTarget)} across active goals
              </p>
            ) : null}
          </div>
        </Reveal>
        <Reveal delay={0.04}>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Active goals
            </p>
            <p className="mt-2 text-2xl font-display font-semibold">
              {stats.activeCount}
            </p>
            <p className="mt-1 text-xs text-muted">Track rent and deposit targets</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Completed
            </p>
            <p className="mt-2 text-2xl font-display font-semibold">
              {stats.completedCount}
            </p>
            <p className="mt-1 text-xs text-muted">Goals you&apos;ve reached</p>
          </div>
        </Reveal>
      </section>

      <section className="space-y-3">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Your goals</h2>
              <p className="text-sm text-muted">
                Save toward rent, deposits, and move-in costs at your own pace.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="app-btn app-btn-primary text-sm"
            >
              {showCreate ? "Cancel" : "New goal"}
            </button>
          </div>
        </Reveal>

        {showCreate ? (
          <Reveal>
            <form
              onSubmit={onCreate}
              className="app-card p-4 sm:p-5 space-y-4 max-w-2xl"
            >
              <div>
                <h3 className="font-semibold">Create a savings goal</h3>
                <p className="text-xs text-muted mt-1">
                  Pick a template or enter your own target below.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {GOAL_TEMPLATES.map((template) => (
                  <button
                    key={template.title}
                    type="button"
                    onClick={() => applyTemplate(template)}
                    className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
                      title === template.title
                        ? "border-brand bg-brand/10"
                        : "border-border hover:border-brand/40 hover:bg-surface/60"
                    }`}
                  >
                    <span className="block text-sm font-medium">
                      {template.title}
                    </span>
                    <span className="block text-xs text-muted mt-0.5">
                      {template.hint}
                    </span>
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">
                    Goal name
                  </label>
                  <input
                    className="app-input w-full"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Rent for May"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Target amount
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="app-input w-full"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="500000"
                    required
                  />
                </div>
                <div>
                  <Select
                    label="Contribution cadence"
                    value={cadence}
                    onChange={(v) => setCadence(v as "weekly" | "monthly")}
                    options={CADENCE_OPTIONS}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="app-btn app-btn-primary text-sm"
                >
                  {saving ? "Creating…" : "Create goal"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="app-btn app-btn-secondary text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Reveal>
        ) : null}
      </section>

      {goals.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["completed", "Completed"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                filter === key
                  ? "border-brand bg-brand/10 font-semibold"
                  : "border-border text-muted hover:border-brand/40 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {goals.length === 0 ? (
        <EmptyState
          title="Start saving toward your next home"
          description="Set a target for rent, deposits, or move-in costs and track progress with weekly or monthly contributions."
        >
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="app-btn app-btn-primary text-sm"
          >
            Create your first goal
          </button>
        </EmptyState>
      ) : filteredGoals.length === 0 ? (
        <EmptyState
          title={`No ${filter} goals`}
          description="Try another filter or create a new savings goal."
        />
      ) : (
        <Stagger className="grid gap-4 lg:grid-cols-2">
          {filteredGoals.map((g) => {
            const pct = progressPct(g.savedAmount, g.targetAmount);
            const remaining = Math.max(0, g.targetAmount - g.savedAmount);
            const isActive = g.status === "active";
            const isCompleted = g.status === "completed";

            return (
              <StaggerItem key={g.id}>
                <article
                  className={`app-card p-5 space-y-4 h-full ${
                    isCompleted ? "border-teal/30 bg-teal/[0.03]" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display font-semibold truncate">
                          {g.title}
                        </h3>
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusClass(g.status)}`}
                        >
                          {statusLabel(g.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {cadenceLabel(g.cadence)} contributions
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-display font-semibold leading-none">
                        {pct}%
                      </p>
                      <p className="text-[10px] uppercase tracking-wider text-muted mt-1">
                        complete
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">
                        {formatMoney(g.savedAmount, g.currency)}
                      </span>
                      <span className="text-muted">
                        of {formatMoney(g.targetAmount, g.currency)}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-surface-dark overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted
                            ? "bg-teal"
                            : "bg-gradient-to-r from-brand to-teal"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {isActive ? (
                      <p className="text-xs text-muted">
                        {formatMoney(remaining, g.currency)} left to reach your
                        target
                      </p>
                    ) : isCompleted ? (
                      <p className="text-xs text-brand-dark font-medium">
                        Target reached — great work!
                      </p>
                    ) : null}
                  </div>

                  {isActive ? (
                    <div className="space-y-3 pt-1 border-t border-border/60">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Quick deposit
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {QUICK_DEPOSITS.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            disabled={depositingId === g.id}
                            onClick={() => void onDeposit(g.id, amount)}
                            className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:border-brand/50 hover:bg-brand/5 transition-colors disabled:opacity-50"
                          >
                            +{formatMoney(amount, g.currency)}
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2 items-end">
                        <div className="flex-1 min-w-[140px]">
                          <label className="block text-xs text-muted mb-1">
                            Custom amount
                          </label>
                          <input
                            type="number"
                            min={1}
                            className="app-input w-full"
                            value={depositAmounts[g.id] || ""}
                            onChange={(e) =>
                              setDepositAmounts((prev) => ({
                                ...prev,
                                [g.id]: e.target.value,
                              }))
                            }
                            placeholder="Enter amount"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={depositingId === g.id}
                          onClick={() => void onDeposit(g.id)}
                          className="app-btn app-btn-primary text-sm"
                        >
                          {depositingId === g.id ? "Saving…" : "Add deposit"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      {goals.length === 0 && !showCreate ? (
        <section className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Popular goals</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {GOAL_TEMPLATES.map((template) => (
              <button
                key={template.title}
                type="button"
                onClick={() => applyTemplate(template)}
                className="app-card app-card-interactive p-4 text-left"
              >
                <p className="font-semibold text-sm">{template.title}</p>
                <p className="mt-1 text-xs text-muted">{template.hint}</p>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
