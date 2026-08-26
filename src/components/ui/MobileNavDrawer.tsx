"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect } from "react";

export type MobileNavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  links: MobileNavItem[];
  footer?: ReactNode;
  /** Extra links below main nav (e.g. Admin Console) */
  extraLinks?: MobileNavItem[];
};

export default function MobileNavDrawer({
  open,
  onClose,
  title,
  subtitle,
  links,
  footer,
  extraLinks = [],
}: Props) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function isActive(link: MobileNavItem) {
    return link.exact
      ? pathname === link.href
      : pathname === link.href || pathname.startsWith(`${link.href}/`);
  }

  function renderLink(link: MobileNavItem) {
    const active = isActive(link);
    return (
      <Link
        key={link.href}
        href={link.href}
        onClick={onClose}
        className={`block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
          active
            ? "bg-brand-subtle text-foreground"
            : "text-muted hover:bg-surface-dark hover:text-foreground"
        }`}
      >
        {link.label}
      </Link>
    );
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-navy/50 backdrop-blur-sm lg:hidden"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col border-r border-border bg-surface shadow-xl lg:hidden"
            initial={reduce ? false : { x: "-100%" }}
            animate={{ x: 0 }}
            exit={reduce ? undefined : { x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
              <div>
                <p className="font-display text-lg font-semibold text-foreground">
                  {title}
                </p>
                {subtitle ? (
                  <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Close navigation"
                onClick={onClose}
                className="rounded-md p-2 text-muted hover:bg-surface-dark hover:text-foreground"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
              {links.map(renderLink)}
              {extraLinks.length ? (
                <div className="mt-3 border-t border-border pt-3 space-y-0.5">
                  {extraLinks.map(renderLink)}
                </div>
              ) : null}
            </nav>

            {footer ? (
              <div className="border-t border-border p-4 space-y-3">{footer}</div>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
