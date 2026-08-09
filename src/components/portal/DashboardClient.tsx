"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { formatGBP } from "@/lib/format";

type Period = "day" | "week" | "month";

type Props = {
  name: string;
  totalInvested: number;
  totalReturns: number;
  portfolioValue: number;
  propertyCount: number;
  monthlyRentTotal: number;
  empty: boolean;
};

const PERIOD_LABEL: Record<Period, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
};

/** Approximate period scaling (same approach as novaOld). */
function scaleMonthly(amount: number, period: Period) {
  if (period === "day") return amount / 30;
  if (period === "week") return amount / 4;
  return amount;
}

export default function DashboardClient({
  name,
  totalInvested,
  totalReturns,
  portfolioValue,
  propertyCount,
  monthlyRentTotal,
  empty,
}: Props) {
  const [period, setPeriod] = useState<Period>("month");

  const scaled = useMemo(() => {
    const rent = scaleMonthly(monthlyRentTotal, period);
    const returns = scaleMonthly(totalReturns, period);
    return { rent, returns };
  }, [monthlyRentTotal, totalReturns, period]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted max-w-2xl">
            Capital and performance Nova reports for {name}. After you buy, Nova
            can manage lease, rent, or Airbnb — returns show in Analytics,
            Calendar, and each property.
          </p>
        </div>
        <div
          className="inline-flex rounded-md border border-border p-0.5 bg-surface"
          role="group"
          aria-label="Period"
        >
          {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                period === key
                  ? "bg-brand text-foreground"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {PERIOD_LABEL[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total invested" value={formatGBP(totalInvested)} />
        <StatCard
          label={`Total returns (${PERIOD_LABEL[period].toLowerCase()})`}
          value={formatGBP(scaled.returns)}
        />
        <StatCard
          label={`Rental income (${PERIOD_LABEL[period].toLowerCase()})`}
          value={formatGBP(scaled.rent)}
        />
        <StatCard label="Properties" value={String(propertyCount)} />
      </div>

      {empty ? (
        <div className="space-y-4">
          <EmptyState
            title="No Nova properties in your portfolio yet"
            description="Nova Elite assigns holdings to you after onboarding, or you can express interest on open Opportunities. Investors cannot create properties themselves."
          />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/portal/opportunities"
              className="app-btn app-btn-primary text-sm"
            >
              Browse opportunities
            </Link>
            <Link
              href="/portal/properties"
              className="app-btn app-btn-secondary text-sm"
            >
              My properties
            </Link>
          </div>
        </div>
      ) : (
        <div className="app-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Portfolio value</h2>
              <p className="text-sm text-muted mt-1">
                Current reported value across holdings Nova assigned to you.
              </p>
            </div>
            <p className="text-2xl font-semibold">{formatGBP(portfolioValue)}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/portal/properties"
              className="text-sm font-medium text-brand-dark hover:underline"
            >
              View my properties →
            </Link>
            <Link
              href="/portal/opportunities"
              className="text-sm font-medium text-brand-dark hover:underline"
            >
              Browse opportunities →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
