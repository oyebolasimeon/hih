"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import EmptyState from "@/components/ui/EmptyState";
import { formatGBP } from "@/lib/format";

type Property = { id: string; name: string };
type Booking = {
  id: string;
  propertyId: string;
  propertyName: string;
  startDate: string;
  endDate: string;
  guestName?: string;
  revenue: number;
  channel: string;
  status: string;
};

export default function CalendarClient({
  properties,
  bookings,
}: {
  properties: Property[];
  bookings: Booking[];
}) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [propertyId, setPropertyId] = useState("all");

  const filtered = useMemo(
    () =>
      propertyId === "all"
        ? bookings
        : bookings.filter((b) => b.propertyId === propertyId),
    [bookings, propertyId]
  );

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });

  function bookingsForDay(day: Date) {
    return filtered.filter((b) => {
      const start = parseISO(String(b.startDate).slice(0, 10));
      const end = parseISO(String(b.endDate).slice(0, 10));
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    });
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No bookings on the calendar"
        description="Confirmed stays across your properties will show here once added by the Nova team."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="app-btn app-btn-secondary"
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            Prev
          </button>
          <h2 className="min-w-[10rem] text-center font-semibold">
            {format(month, "MMMM yyyy")}
          </h2>
          <button
            type="button"
            className="app-btn app-btn-secondary"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            Next
          </button>
        </div>
        <select
          className="app-input max-w-xs"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
        >
          <option value="all">All properties</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="app-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border text-xs text-muted">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="px-2 py-2 text-center font-medium">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayBookings = bookingsForDay(day);
            const inMonth = isSameMonth(day, month);
            return (
              <div
                key={day.toISOString()}
                className={`min-h-24 border-b border-r border-border p-1.5 ${
                  inMonth ? "bg-background" : "bg-surface/50"
                }`}
              >
                <p
                  className={`text-xs mb-1 ${
                    inMonth ? "text-foreground" : "text-muted"
                  }`}
                >
                  {format(day, "d")}
                </p>
                <div className="space-y-1">
                  {dayBookings.slice(0, 2).map((b) => (
                    <div
                      key={`${b.id}-${day.toISOString()}`}
                      className="rounded bg-brand-subtle px-1 py-0.5 text-[10px] leading-tight truncate"
                      title={`${b.propertyName} · ${b.status} · ${b.channel}`}
                    >
                      {b.propertyName}
                    </div>
                  ))}
                  {dayBookings.length > 2 ? (
                    <p className="text-[10px] text-muted">+{dayBookings.length - 2} more</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="app-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3">Property</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">{b.propertyName}</td>
                <td className="px-4 py-3">
                  {String(b.startDate).slice(0, 10)} → {String(b.endDate).slice(0, 10)}
                </td>
                <td className="px-4 py-3 capitalize">{b.channel}</td>
                <td className="px-4 py-3 capitalize">{b.status}</td>
                <td className="px-4 py-3">{formatGBP(b.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
