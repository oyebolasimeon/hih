"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type Announcement = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  publishedAt: string | null;
};

const STORAGE_KEY = "hih-announcement-dismissed";

function wasDismissed(id: string) {
  try {
    return localStorage.getItem(STORAGE_KEY) === id;
  } catch {
    return false;
  }
}

function markDismissed(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export default function AnnouncementModal() {
  const reduce = useReducedMotion();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/public/announcements/active");
        const data = await res.json();
        if (cancelled) return;
        const a = data.announcement as Announcement | null;
        if (!a?.id) return;
        if (wasDismissed(a.id)) return;
        setAnnouncement(a);
        // Slight delay so the page paints first
        window.setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, 600);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(() => {
    if (announcement?.id) markDismissed(announcement.id);
    setOpen(false);
  }, [announcement?.id]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, dismiss]);

  return (
    <AnimatePresence>
      {open && announcement ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="hih-announcement-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-navy/70 backdrop-blur-sm"
            aria-label="Dismiss announcement"
            onClick={dismiss}
          />

          <motion.div
            className="relative z-10 flex max-h-[90svh] w-full max-w-lg flex-col overflow-hidden rounded-sm border border-navy/10 bg-sand shadow-2xl"
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="bg-navy px-5 py-4 text-sand">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
                House In Hands · Announcement
              </p>
              {announcement.subtitle ? (
                <p className="mt-2 text-sm text-sand/75">
                  {announcement.subtitle}
                </p>
              ) : null}
              <h2
                id="hih-announcement-title"
                className="mt-2 font-display text-xl font-bold tracking-tight sm:text-2xl"
              >
                {announcement.title}
              </h2>
            </div>

            <div className="overflow-y-auto px-5 py-5">
              {announcement.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={announcement.imageUrl}
                  alt=""
                  className="mb-4 w-full rounded-sm border border-navy/10 object-cover"
                />
              ) : null}
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy/80">
                {announcement.body}
              </p>
            </div>

            <div className="flex flex-col gap-2 border-t border-navy/10 bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-teal">
                Property. In Your Hands.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={dismiss}
                  className="site-btn site-btn-outline text-sm"
                >
                  Close
                </button>
                {announcement.ctaUrl && announcement.ctaLabel ? (
                  <Link
                    href={announcement.ctaUrl}
                    onClick={dismiss}
                    className="site-btn site-btn-teal text-sm"
                  >
                    {announcement.ctaLabel}
                  </Link>
                ) : null}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
