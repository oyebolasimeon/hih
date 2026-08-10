"use client";

import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import { StatCardsSkeleton } from "@/components/ui/Skeleton";

type Analytics = {
  listingsByStatus: Record<string, number>;
  totalListings: number;
  occupancyRate: number;
  applicationsOpen: number;
  rentCollected: number;
  arrearsEstimate: number;
  expectedMonthlyRent: number;
  currency: string;
};

export default function AnalyticsClient() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/analytics");
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Unable to load analytics.");
      setData(null);
      return;
    }
    setData(json.analytics);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <StatCardsSkeleton count={4} />;

  if (error) {
    return (
      <EmptyState
        title="Analytics unavailable"
        description={error}
      />
    );
  }

  if (!data) {
    return (
      <EmptyState
        title="No analytics"
        description="Switch to a landlord or estate manager profile to view estate insights."
      />
    );
  }

  const fmt = (n: number) =>
    `${data.currency} ${Math.round(n).toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Occupancy"
          value={`${data.occupancyRate}%`}
          hint={`${data.listingsByStatus.occupied || 0} of ${data.totalListings} units`}
        />
        <StatCard
          label="Open applications"
          value={String(data.applicationsOpen)}
        />
        <StatCard
          label="Rent collected"
          value={fmt(data.rentCollected)}
          hint="Successful payments"
        />
        <StatCard
          label="Arrears estimate"
          value={fmt(data.arrearsEstimate)}
          hint={`Expected this month ${fmt(data.expectedMonthlyRent)}`}
        />
      </div>

      <div className="app-card p-5">
        <h2 className="font-semibold mb-3">Listings by status</h2>
        <ul className="grid sm:grid-cols-2 gap-2 text-sm">
          {Object.entries(data.listingsByStatus).map(([status, count]) => (
            <li
              key={status}
              className="flex justify-between border-b border-border py-2"
            >
              <span className="capitalize text-muted">{status}</span>
              <span className="font-medium">{count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
