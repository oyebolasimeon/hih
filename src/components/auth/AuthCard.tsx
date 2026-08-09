"use client";

import Link from "next/link";
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

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-black/55" aria-hidden />

      <Link
        href="/"
        className="absolute top-5 left-5 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70 transition-colors"
        aria-label="Back to home"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </Link>

      <Link
        href="/"
        className="absolute bottom-5 left-5 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 p-1.5 backdrop-blur-sm hover:bg-black/75 transition-colors"
        aria-label="Nova Elite Homes home"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo.png"
          alt="Nova Elite Homes"
          className="h-full w-full rounded-full object-contain"
        />
      </Link>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-[420px] rounded-2xl bg-white p-7 sm:p-9 shadow-[0_24px_80px_rgba(0,0,0,0.35)] text-[#0c0d0b]">
          <h1 className="font-display text-2xl sm:text-[1.75rem] font-semibold tracking-tight text-[#0c0d0b]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-[#5c6356]">{subtitle}</p>
          ) : null}
          <div className="mt-7 auth-card-body">{children}</div>
          {footer ? (
            <div className="mt-7 text-sm text-[#5c6356] text-center">{footer}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
