"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import BrandMark from "@/components/BrandMark";
import { useBranding } from "@/components/providers/BrandingProvider";
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
  const layoutBg = useAuthBackground();
  const { branding } = useBranding();
  const bg = branding.authBackgroundUrl || layoutBg || "/hero-home.jpg";
  const reduce = useReducedMotion();

  return (
    <div className="relative min-h-screen overflow-hidden bg-navy">
      <motion.div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bg})` }}
        aria-hidden
        initial={reduce ? false : { scale: 1.08 }}
        animate={reduce ? { scale: 1 } : { scale: [1.08, 1.02, 1.06] }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 24, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <div className="absolute inset-0 bg-navy/80" aria-hidden />

      <div className="absolute top-5 left-5 z-20">
        <BrandMark invert href="/" size="sm" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-20 sm:px-6">
        <motion.div
          className="w-full max-w-[420px] bg-sand p-7 sm:p-9 text-navy shadow-[0_24px_80px_rgba(11,31,58,0.45)]"
          initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
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
              ← Back to {branding.appName}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
