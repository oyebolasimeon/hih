"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
};

export default function Select({
  options,
  value,
  onChange,
  placeholder = "Select…",
  label,
  name,
  id,
  disabled = false,
  required = false,
  className = "",
}: SelectProps) {
  const autoId = useId();
  const selectId = id || autoId;
  const listId = `${selectId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const enabledOptions = useMemo(
    () => options.filter((o) => !o.disabled),
    [options]
  );

  useEffect(() => {
    if (!open) return;
    const idx = enabledOptions.findIndex((o) => o.value === value);
    setHighlight(idx >= 0 ? idx : 0);

    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, enabledOptions, value]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
  }

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function onListKeyDown(e: KeyboardEvent<HTMLUListElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, enabledOptions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const opt = enabledOptions[highlight];
      if (opt) choose(opt.value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {label ? (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          {label}
          {required ? " *" : ""}
        </label>
      ) : null}

      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}

      <button
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={`flex w-full items-center justify-between gap-3 rounded-[0.375rem] border px-3.5 py-2.5 text-left text-sm transition-colors ${
          disabled
            ? "cursor-not-allowed opacity-50 border-border bg-surface text-muted"
            : open
              ? "border-brand bg-background text-foreground shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-brand)_40%,transparent)]"
              : "border-border bg-background text-foreground hover:border-brand/50"
        }`}
      >
        <span className={selected ? "text-foreground" : "text-muted"}>
          {selected?.label || placeholder}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-brand transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-activedescendant={`${selectId}-opt-${highlight}`}
          onKeyDown={onListKeyDown}
          className="absolute z-40 mt-1.5 max-h-60 w-full overflow-auto rounded-[0.375rem] border border-border bg-card py-1 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)]"
        >
          {options.length === 0 ? (
            <li className="px-3.5 py-2.5 text-sm text-muted">No options</li>
          ) : (
            options.map((opt) => {
              const enabledIdx = enabledOptions.findIndex(
                (o) => o.value === opt.value
              );
              const isSelected = opt.value === value;
              const isActive = !opt.disabled && enabledIdx === highlight;
              return (
                <li
                  key={opt.value}
                  id={`${selectId}-opt-${enabledIdx}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled || undefined}
                  className={`cursor-pointer px-3.5 py-2.5 text-sm ${
                    opt.disabled
                      ? "cursor-not-allowed text-muted/50"
                      : isActive
                        ? "bg-brand text-[#0c0d0b] font-medium"
                        : isSelected
                          ? "bg-brand-subtle text-foreground"
                          : "text-foreground hover:bg-surface-dark"
                  }`}
                  onMouseEnter={() => {
                    if (!opt.disabled && enabledIdx >= 0) setHighlight(enabledIdx);
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    if (!opt.disabled) choose(opt.value);
                  }}
                >
                  <span className="flex items-center justify-between gap-2">
                    {opt.label}
                    {isSelected ? (
                      <span className="font-mono text-xs opacity-80">✓</span>
                    ) : null}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}

/** Select that keeps internal state for classic form submissions via `name`. */
export function FormSelect({
  defaultValue = "",
  ...props
}: Omit<SelectProps, "value" | "onChange"> & { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  return <Select {...props} value={value} onChange={setValue} />;
}
