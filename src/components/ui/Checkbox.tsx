"use client";

import { useId, type InputHTMLAttributes, type ReactNode } from "react";

type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "onChange"
> & {
  label?: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  /** Compact row used in permission grids */
  variant?: "default" | "card";
};

export default function Checkbox({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className = "",
  variant = "default",
  id,
  name,
  ...rest
}: CheckboxProps) {
  const autoId = useId();
  const inputId = id || autoId;

  const control = (
    <span
      className={`relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border transition-all duration-150 ${
        checked
          ? "border-brand bg-brand shadow-[inset_0_0_0_1px_rgba(12,13,11,0.06)]"
          : "border-border-dark bg-background"
      } ${
        disabled
          ? "opacity-50"
          : "group-hover:border-brand/70 group-focus-within:ring-2 group-focus-within:ring-brand/35"
      }`}
      aria-hidden
    >
      <svg
        className={`h-3 w-3 text-[#0c0d0b] transition-all duration-150 ${
          checked ? "scale-100 opacity-100" : "scale-75 opacity-0"
        }`}
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2.2 6.2 4.8 8.8 9.8 3.2" />
      </svg>
    </span>
  );

  const body = (
    <>
      {control}
      {(label || description) && (
        <span className="min-w-0 flex-1">
          {label ? (
            <span className="block text-sm font-medium text-foreground leading-snug">
              {label}
            </span>
          ) : null}
          {description ? (
            <span className="mt-0.5 block text-xs text-muted leading-snug">
              {description}
            </span>
          ) : null}
        </span>
      )}
    </>
  );

  return (
    <label
      htmlFor={inputId}
      className={`group relative inline-flex cursor-pointer items-start gap-3 select-none ${
        disabled ? "cursor-not-allowed" : ""
      } ${
        variant === "card"
          ? `w-full rounded-lg border px-3.5 py-3 transition-colors ${
              checked
                ? "border-brand/45 bg-brand-subtle/80"
                : "border-border bg-surface/60 hover:border-border-dark hover:bg-surface"
            } ${disabled ? "opacity-70" : ""}`
          : ""
      } ${className}`}
    >
      <input
        {...rest}
        id={inputId}
        name={name}
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      {body}
    </label>
  );
}
