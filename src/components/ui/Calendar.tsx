"use client";

import { useMemo } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  isWithinInterval,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export type CalendarEvent = {
  id: string;
  title: string;
  startDate: string | Date;
  endDate: string | Date;
  tone?: "brand" | "muted" | "warn";
  meta?: string;
};

type CalendarProps = {
  month: Date;
  onMonthChange: (month: Date) => void;
  events?: CalendarEvent[];
  selectedDay?: Date | null;
  onDayClick?: (day: Date, events: CalendarEvent[]) => void;
  weekStartsOn?: 0 | 1;
  className?: string;
};

function toDate(value: string | Date) {
  if (value instanceof Date) return value;
  return parseISO(String(value).slice(0, 10));
}

export default function Calendar({
  month,
  onMonthChange,
  events = [],
  selectedDay = null,
  onDayClick,
  weekStartsOn = 1,
  className = "",
}: CalendarProps) {
  const monthStart = startOfMonth(month);

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(monthStart, { weekStartsOn }),
        end: endOfWeek(endOfMonth(monthStart), { weekStartsOn }),
      }),
    [monthStart, weekStartsOn]
  );

  const weekdayLabels = useMemo(() => {
    const base = startOfWeek(new Date(), { weekStartsOn });
    return eachDayOfInterval({
      start: base,
      end: endOfWeek(base, { weekStartsOn }),
    }).map((d) => format(d, "EEE"));
  }, [weekStartsOn]);

  function eventsForDay(day: Date) {
    return events.filter((event) => {
      const start = toDate(event.startDate);
      const end = toDate(event.endDate);
      try {
        return (
          isWithinInterval(day, { start, end }) ||
          isSameDay(day, start) ||
          isSameDay(day, end)
        );
      } catch {
        return false;
      }
    });
  }

  return (
    <div className={`nova-calendar app-card overflow-hidden ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 bg-surface">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[0.375rem] border border-border bg-background text-foreground hover:border-brand hover:text-brand transition-colors"
          onClick={() => onMonthChange(addMonths(monthStart, -1))}
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>

        <div className="text-center">
          <p className="font-display text-base font-semibold tracking-tight text-foreground">
            {format(monthStart, "MMMM yyyy")}
          </p>
          <button
            type="button"
            className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-brand hover:text-brand-light"
            onClick={() => onMonthChange(startOfMonth(new Date()))}
          >
            Today
          </button>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[0.375rem] border border-border bg-background text-foreground hover:border-brand hover:text-brand transition-colors"
          onClick={() => onMonthChange(addMonths(monthStart, 1))}
          aria-label="Next month"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-border bg-surface-dark/40">
        {weekdayLabels.map((label) => (
          <div
            key={label}
            className="px-1 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsForDay(day);
          const inMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          const selected = selectedDay ? isSameDay(day, selectedDay) : false;
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick?.(day, dayEvents)}
              className={`group relative min-h-[5.5rem] border-b border-r border-border p-1.5 text-left transition-colors ${
                inMonth ? "bg-background" : "bg-surface/40"
              } ${selected ? "ring-1 ring-inset ring-brand" : ""} ${
                onDayClick ? "hover:bg-brand-subtle/80 cursor-pointer" : "cursor-default"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`inline-flex h-6 min-w-6 items-center justify-center rounded-[0.3rem] px-1 font-mono text-xs tabular-nums ${
                    today
                      ? "bg-brand text-[#0c0d0b] font-semibold"
                      : selected
                        ? "text-brand font-semibold"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted/60"
                  }`}
                >
                  {format(day, "d")}
                </span>
                {hasEvents ? (
                  <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                ) : null}
              </div>

              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <div
                    key={`${event.id}-${day.toISOString()}`}
                    title={event.meta ? `${event.title} · ${event.meta}` : event.title}
                    className={`truncate rounded-[0.25rem] px-1 py-0.5 text-[10px] leading-tight font-medium ${
                      event.tone === "warn"
                        ? "bg-[color-mix(in_srgb,var(--color-danger)_18%,transparent)] text-danger"
                        : event.tone === "muted"
                          ? "bg-surface-dark text-muted"
                          : "bg-brand/20 text-foreground border border-brand/25"
                    }`}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 2 ? (
                  <p className="text-[10px] font-medium text-brand">
                    +{dayEvents.length - 2} more
                  </p>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
