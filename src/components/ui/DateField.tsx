"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { format, parseISO, startOfMonth } from "date-fns";
import Calendar from "@/components/ui/Calendar";

type DateFieldProps = {
  label?: string;
  value: string;
  onChange: (isoDate: string) => void;
  /** Minimum selectable day as YYYY-MM-DD */
  min?: string;
  /** Maximum selectable day as YYYY-MM-DD */
  max?: string;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  placeholder?: string;
  className?: string;
  id?: string;
};

function toIsoDay(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function parseDay(value: string): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value.slice(0, 10));
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

export default function DateField({
  label,
  value,
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  helpText,
  placeholder = "Select a date",
  className = "",
  id,
}: DateFieldProps) {
  const autoId = useId();
  const fieldId = id || autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseDay(value), [value]);
  const [month, setMonth] = useState<Date>(
    () => startOfMonth(selected || new Date())
  );

  useEffect(() => {
    if (selected) setMonth(startOfMonth(selected));
  }, [selected]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function isDisabledDay(day: Date) {
    const iso = toIsoDay(day);
    if (min && iso < min) return true;
    if (max && iso > max) return true;
    return false;
  }

  return (
    <div ref={rootRef} className={`relative space-y-1.5 ${className}`}>
      {label ? (
        <label htmlFor={fieldId} className="block text-sm font-medium">
          {label}
          {required ? <span className="text-danger"> *</span> : null}
        </label>
      ) : null}
      {helpText ? <p className="text-xs text-muted">{helpText}</p> : null}

      <button
        id={fieldId}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="app-input w-full flex items-center justify-between gap-3 text-left disabled:opacity-50"
      >
        <span className={selected ? "text-foreground" : "text-muted"}>
          {selected ? format(selected, "EEE, d MMM yyyy") : placeholder}
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-muted"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm-2 6h12v8H4V8z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Hidden input for native form required semantics */}
      <input
        type="text"
        tabIndex={-1}
        className="sr-only"
        value={value}
        required={required}
        readOnly
        aria-hidden
      />

      {open ? (
        <div
          className="absolute left-0 right-0 z-40 mt-2 origin-top"
          role="dialog"
          aria-label={label || "Choose date"}
        >
          <div className="overflow-hidden rounded-xl border border-border bg-background shadow-xl">
            <Calendar
              month={month}
              onMonthChange={setMonth}
              selectedDay={selected}
              onDayClick={(day) => {
                if (isDisabledDay(day)) return;
                onChange(toIsoDay(day));
                setOpen(false);
              }}
              className="!rounded-none !border-0 !shadow-none"
            />
            <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 bg-surface">
              <button
                type="button"
                className="text-xs text-muted hover:text-foreground"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className="text-xs font-medium text-brand hover:underline"
                onClick={() => {
                  const today = toIsoDay(new Date());
                  if (min && today < min) return;
                  if (max && today > max) return;
                  onChange(today);
                  setOpen(false);
                }}
              >
                Use today
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
