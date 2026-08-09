"use client";

import { useMemo, useState } from "react";
import { format, startOfMonth } from "date-fns";
import Calendar from "@/components/ui/Calendar";
import Select from "@/components/ui/Select";
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
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const filtered = useMemo(
    () =>
      propertyId === "all"
        ? bookings
        : bookings.filter((b) => b.propertyId === propertyId),
    [bookings, propertyId]
  );

  const events = useMemo(
    () =>
      filtered.map((b) => ({
        id: b.id,
        title: b.propertyName,
        startDate: b.startDate,
        endDate: b.endDate,
        tone:
          b.status === "cancelled"
            ? ("warn" as const)
            : b.status === "pending"
              ? ("muted" as const)
              : ("brand" as const),
        meta: `${b.status} · ${b.channel}`,
      })),
    [filtered]
  );

  const propertyOptions = useMemo(
    () => [
      { value: "all", label: "All properties" },
      ...properties.map((p) => ({ value: p.id, label: p.name })),
    ],
    [properties]
  );

  const dayBookings = useMemo(() => {
    if (!selectedDay) return filtered;
    const key = format(selectedDay, "yyyy-MM-dd");
    return filtered.filter((b) => {
      const start = String(b.startDate).slice(0, 10);
      const end = String(b.endDate).slice(0, 10);
      return key >= start && key <= end;
    });
  }, [filtered, selectedDay]);

  if (bookings.length === 0) {
    return (
      <EmptyState
        title="No managed stays yet"
        description="When Nova operates lease, rent, or Airbnb stays on your properties, they will appear on this calendar."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end justify-between">
        <p className="text-sm text-muted max-w-md">
          Multi-property occupancy calendar. Filter by property or click a day
          to focus the list below.
        </p>
        <Select
          className="w-full sm:w-64"
          value={propertyId}
          onChange={setPropertyId}
          options={propertyOptions}
          placeholder="Filter property"
        />
      </div>

      <Calendar
        month={month}
        onMonthChange={(next) => {
          setMonth(next);
          setSelectedDay(null);
        }}
        events={events}
        selectedDay={selectedDay}
        onDayClick={(day) =>
          setSelectedDay((prev) =>
            prev && format(prev, "yyyy-MM-dd") === format(day, "yyyy-MM-dd")
              ? null
              : day
          )
        }
      />

      <div className="app-card overflow-x-auto">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <p className="text-sm font-medium">
            {selectedDay
              ? `Bookings on ${format(selectedDay, "d MMM yyyy")}`
              : "All filtered bookings"}
          </p>
          {selectedDay ? (
            <button
              type="button"
              className="text-xs font-medium text-brand hover:text-brand-light"
              onClick={() => setSelectedDay(null)}
            >
              Clear day filter
            </button>
          ) : null}
        </div>
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Property</th>
              <th className="px-4 py-3 font-medium">Dates</th>
              <th className="px-4 py-3 font-medium">Channel</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {dayBookings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-muted text-center">
                  No bookings for this selection.
                </td>
              </tr>
            ) : (
              dayBookings.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{b.propertyName}</td>
                  <td className="px-4 py-3 font-mono text-xs tabular-nums">
                    {String(b.startDate).slice(0, 10)} → {String(b.endDate).slice(0, 10)}
                  </td>
                  <td className="px-4 py-3 capitalize">{b.channel}</td>
                  <td className="px-4 py-3 capitalize">{b.status}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {formatGBP(b.revenue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
