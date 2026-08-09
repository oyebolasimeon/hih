"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatGBP, formatPercent } from "@/lib/format";
import StatCard from "@/components/ui/StatCard";

const COLORS = ["#A8BF44", "#8FA63A", "#6b7280", "#BFDA4F", "#1a1a1a"];

type AnalyticsRow = {
  id: string;
  period: string;
  revenue: number;
  commission: number;
  occupancyRate: number;
  channelBreakdown: Record<string, number>;
};

export default function AnalyticsCharts({
  periods,
  selected,
  onSelect,
}: {
  periods: AnalyticsRow[];
  selected: AnalyticsRow | null;
  onSelect: (period: string) => void;
}) {
  const channelData = selected
    ? Object.entries(selected.channelBreakdown || {}).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const trendData = [...periods]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((p) => ({
      period: p.period,
      revenue: p.revenue,
      commission: p.commission,
      occupancy: p.occupancyRate,
    }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-medium" htmlFor="period">
          Period
        </label>
        <select
          id="period"
          className="app-input max-w-xs"
          value={selected?.period || ""}
          onChange={(e) => onSelect(e.target.value)}
        >
          {periods.map((p) => (
            <option key={p.id} value={p.period}>
              {p.period}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <StatCard label="Revenue" value={formatGBP(selected.revenue)} />
            <StatCard label="Commission" value={formatGBP(selected.commission)} />
            <StatCard
              label="Occupancy"
              value={formatPercent(selected.occupancyRate)}
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="app-card p-4 h-80">
              <h3 className="text-sm font-medium mb-3">Revenue vs commission</h3>
              <ResponsiveContainer width="100%" height="90%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="revenue" fill="#A8BF44" name="Revenue" />
                  <Bar dataKey="commission" fill="#6b7280" name="Commission" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="app-card p-4 h-80">
              <h3 className="text-sm font-medium mb-3">
                Channel breakdown · {selected.period}
              </h3>
              {channelData.length === 0 ? (
                <p className="text-sm text-muted pt-8 text-center">
                  No channel breakdown for this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={channelData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                      label
                    >
                      {channelData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
