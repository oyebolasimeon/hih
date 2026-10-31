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
  // Clear-space discipline: mark stays ≥24px; padding protects the window/hand contours
  const sizes = {
    sm: { mark: "h-7 w-7 min-h-[24px] min-w-[24px]", text: "text-sm" },
    md: { mark: "h-9 w-9", text: "text-[0.95rem]" },
    lg: { mark: "h-11 w-11", text: "text-lg" },
  }[size];

  const name = branding.appName || "House In Hands";
  const logoSrc = branding.logoUrl?.trim() || "/logo.png";

  const mark = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoSrc}
      alt=""
      className={`${sizes.mark} shrink-0 object-contain p-0.5`}
    />
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
