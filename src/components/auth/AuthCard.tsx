"use client";

import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import { useAuthBackground } from "@/components/auth/AuthBackgroundContext";

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const backgroundUrl = useAuthBackground();
  const bg = backgroundUrl || "/hero-home.jpg";

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-navy/80" aria-hidden />

      <div className="absolute top-5 left-5 z-20">
        <BrandMark invert href="/" size="sm" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20 sm:px-6">
        <div className="w-full max-w-[420px] bg-sand p-7 sm:p-9 text-navy shadow-[0_24px_80px_rgba(11,31,58,0.45)]">
          <h1 className="font-display text-2xl sm:text-[1.75rem] font-semibold tracking-tight text-navy">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
          ) : null}
          <div className="mt-7 auth-card-body">{children}</div>
          {footer ? (
            <div className="mt-7 text-sm text-muted text-center">{footer}</div>
          ) : null}
          <p className="mt-6 text-center text-xs text-muted">
            <Link href="/" className="text-teal-dark hover:underline">
              ← Back to House In Hand
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
