"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type ModalContent = {
  title: string;
  body: string;
  ctaLabel: string;
  imageUrl: string;
};

function ImagePanel({ imageUrl, title }: { imageUrl: string; title: string }) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={title}
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <div className="relative flex h-full min-h-[220px] w-full flex-col items-center justify-center overflow-hidden bg-[#1a1f14] p-8 text-center">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, #A8BF44 0%, transparent 45%), radial-gradient(circle at 80% 70%, #A8BF44 0%, transparent 40%)",
        }}
      />
      <div className="relative z-10 space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt=""
            className="h-8 w-8 rounded-sm object-contain"
          />
        </div>
        <p className="font-display text-lg font-semibold text-white">
          Investor experience
        </p>
        <p className="mx-auto max-w-xs text-sm text-white/70">
          Upload a hero image from Admin → Login modal to replace this
          placeholder.
        </p>
      </div>
    </div>
  );
}

export default function InvestorLoginModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [content, setContent] = useState<ModalContent | null>(null);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef("");
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTyping = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const finishTyping = useCallback(() => {
    stopTyping();
    setTyped(bodyRef.current);
    setDone(true);
  }, [stopTyping]);

  const startTyping = useCallback(
    (body: string) => {
      stopTyping();
      bodyRef.current = body;
      indexRef.current = 0;
      setTyped("");
      setDone(false);

      timerRef.current = setInterval(() => {
        indexRef.current += 1;
        const next = body.slice(0, indexRef.current);
        setTyped(next);
        if (indexRef.current >= body.length) {
          finishTyping();
        }
      }, 14);
    },
    [finishTyping, stopTyping]
  );

  useEffect(() => {
    if (!open) {
      stopTyping();
      setContent(null);
      setTyped("");
      setDone(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/site/investor-modal");
        const data = await res.json();
        if (cancelled) return;
        const next: ModalContent = {
          title: data.title || "Your Investor Portal",
          body: data.body || "",
          ctaLabel: data.ctaLabel || "Continue to Login",
          imageUrl: data.imageUrl || "",
        };
        setContent(next);
        setLoading(false);
        startTyping(next.body);
      } catch {
        if (!cancelled) {
          setLoading(false);
          setContent({
            title: "Your Investor Portal",
            body: "Welcome to Nova Elite Homes. Continue to access your investor portal.",
            ctaLabel: "Continue to Login",
            imageUrl: "",
          });
          startTyping(
            "Welcome to Nova Elite Homes. Continue to access your investor portal."
          );
        }
      }
    })();

    return () => {
      cancelled = true;
      stopTyping();
    };
  }, [open, startTyping, stopTyping]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="investor-login-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />

      <div className="relative z-10 grid max-h-[min(92vh,900px)] w-full max-w-4xl overflow-hidden rounded-xl border border-white/10 bg-[#0f110d] shadow-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden min-h-[280px] lg:block lg:min-h-full">
          <ImagePanel
            imageUrl={content?.imageUrl || ""}
            title={content?.title || "Investor Portal"}
          />
        </div>

        <div className="flex max-h-[min(92vh,900px)] flex-col">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
                Nova Elite Homes
              </p>
              <h2
                id="investor-login-modal-title"
                className="mt-1 font-display text-xl font-semibold text-white sm:text-2xl"
              >
                {loading ? "Loading…" : content?.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>

          <div className="min-h-[160px] border-b border-white/10 lg:hidden">
            <div className="aspect-[16/10] w-full">
              <ImagePanel
                imageUrl={content?.imageUrl || ""}
                title={content?.title || "Investor Portal"}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-3 w-full rounded bg-white/10" />
                <div className="h-3 w-11/12 rounded bg-white/10" />
                <div className="h-3 w-4/5 rounded bg-white/10" />
                <div className="h-3 w-full rounded bg-white/10" />
              </div>
            ) : (
              <button
                type="button"
                onClick={finishTyping}
                className="w-full text-left"
                title={done ? undefined : "Click to finish typing"}
              >
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/85">
                  {typed}
                  {!done ? (
                    <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-brand align-middle" />
                  ) : null}
                </pre>
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            {!done && !loading ? (
              <button
                type="button"
                onClick={finishTyping}
                className="text-sm text-white/60 hover:text-white"
              >
                Skip intro
              </button>
            ) : (
              <span className="text-xs text-white/40">
                Private to your portfolio
              </span>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/5"
              >
                Maybe later
              </button>
              <button
                type="button"
                disabled={!done && !loading}
                onClick={() => {
                  onClose();
                  router.push("/login");
                }}
                className="rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-[#0c0d0b] transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {content?.ctaLabel || "Continue to Login"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
