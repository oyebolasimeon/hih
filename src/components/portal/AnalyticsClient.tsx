"use client";

import { useMemo, useState } from "react";
import AnalyticsCharts from "@/components/portal/AnalyticsCharts";
import EmptyState from "@/components/ui/EmptyState";

type AnalyticsRow = {
  id: string;
  period: string;
  revenue: number;
  commission: number;
  occupancyRate: number;
  avgNightlyRate: number;
  revenuePAL: number;
  channelBreakdown: Record<string, number>;
};

export default function AnalyticsClient({ periods }: { periods: AnalyticsRow[] }) {
  const sorted = useMemo(
    () => [...periods].sort((a, b) => b.period.localeCompare(a.period)),
    [periods]
  );
  const [period, setPeriod] = useState(sorted[0]?.period || "");
  const selected = sorted.find((p) => p.period === period) || sorted[0] || null;

  if (sorted.length === 0) {
    return (
      <EmptyState
        title="No returns published yet"
        description="When Nova manages lettings on your properties, monthly revenue, commission, occupancy, and channel mix will appear here."
      />
    );
  }

  return (
    <AnalyticsCharts
      periods={sorted}
      selected={selected}
      onSelect={setPeriod}
    />
  );
}
