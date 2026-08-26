"use client";

import Link from "next/link";
import { useBranding } from "@/components/providers/BrandingProvider";

type Props = {
  href?: string;
  className?: string;
  invert?: boolean;
  size?: "sm" | "md" | "lg";
  /** When true, always show the app name. When false, icon only. Default: hide name below lg. */
  showLabel?: boolean;
};

export default function BrandMark({
  href = "/",
  className = "",
  invert = false,
  size = "md",
  showLabel,
}: Props) {
  const { branding } = useBranding();
  const sizes = {
    sm: { mark: "h-7 w-7", text: "text-sm" },
    md: { mark: "h-8 w-8", text: "text-[0.95rem]" },
    lg: { mark: "h-10 w-10", text: "text-lg" },
  }[size];

  const name = branding.appName || "House In Hand";

  const mark = branding.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={branding.logoUrl}
      alt={name}
      className={`${sizes.mark} rounded-sm object-contain bg-white/10`}
    />
  ) : (
    <span
      className={`${sizes.mark} relative flex shrink-0 items-center justify-center overflow-hidden rounded-sm ${
        invert ? "bg-teal" : "bg-navy"
      }`}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="h-[70%] w-[70%]" fill="none">
        <path
          d="M8 22 L20 12 L32 22 V30 H8 V22Z"
          stroke={invert ? "#F4E9D8" : "var(--teal, #00A6A6)"}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M14 30 V24 H26 V30"
          stroke={invert ? "#0B1F3A" : "#F4E9D8"}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M6 31.5 C12 34 28 34 34 31.5"
          stroke={invert ? "#F4E9D8" : "var(--teal, #00A6A6)"}
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    </span>
  );

  const labelClass =
    showLabel === true
      ? ""
      : showLabel === false
        ? "hidden"
        : "hidden lg:inline";

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      <span
        className={`font-display font-semibold tracking-tight ${sizes.text} ${labelClass} ${
          invert ? "text-sand" : "text-navy"
        }`}
      >
        {name}
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link
      href={href}
      aria-label={showLabel === true ? undefined : name}
      className="inline-flex hover:opacity-90 transition-opacity"
    >
      {content}
    </Link>
  );
}
