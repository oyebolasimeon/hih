"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  isMutatingMethod,
  isSameOriginApiRequest,
  isSilentMutation,
  messageFromResponse,
  readJsonBody,
  resolveRequestMethod,
} from "@/lib/mutation-fetch";

type ToastKind = "success" | "error";

type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

type MutationContextValue = {
  pendingCount: number;
  pushToast: (kind: ToastKind, message: string) => void;
};

const MutationContext = createContext<MutationContextValue | null>(null);

const TOAST_DURATION_MS = 4200;
const MIN_LOADER_MS = 500;

function MutationSpinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={`mutation-spinner ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MutationProvider({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const [pendingCount, setPendingCount] = useState(0);
  const [showLoader, setShowLoader] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const pendingRef = useRef(0);
  const loaderShownAtRef = useRef<number | null>(null);
  const hideLoaderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const begin = useCallback(() => {
    if (hideLoaderTimerRef.current) {
      clearTimeout(hideLoaderTimerRef.current);
      hideLoaderTimerRef.current = null;
    }
    pendingRef.current += 1;
    if (pendingRef.current === 1) {
      loaderShownAtRef.current = Date.now();
      setShowLoader(true);
    }
    setPendingCount(pendingRef.current);
  }, []);

  const end = useCallback(() => {
    pendingRef.current = Math.max(0, pendingRef.current - 1);
    setPendingCount(pendingRef.current);

    if (pendingRef.current === 0) {
      const shownAt = loaderShownAtRef.current ?? Date.now();
      const elapsed = Date.now() - shownAt;
      const remaining = Math.max(0, MIN_LOADER_MS - elapsed);
      hideLoaderTimerRef.current = setTimeout(() => {
        setShowLoader(false);
        loaderShownAtRef.current = null;
        hideLoaderTimerRef.current = null;
      }, remaining);
    }
  }, []);

  const pushToast = useCallback((kind: ToastKind, message: string) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, kind, message }]);
    const timer = setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      toastTimers.current.delete(id);
    }, TOAST_DURATION_MS);
    toastTimers.current.set(id, timer);
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimers.current.get(id);
    if (timer) clearTimeout(timer);
    toastTimers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input, init) => {
      const method = resolveRequestMethod(input, init);
      const track =
        isMutatingMethod(method) &&
        isSameOriginApiRequest(input) &&
        !isSilentMutation(input, init);

      if (!track) {
        return originalFetch(input, init);
      }

      begin();
      try {
        const response = await originalFetch(input, init);
        const data = await readJsonBody(response.clone());
        pushToast(
          response.ok ? "success" : "error",
          messageFromResponse(data, response.ok, response.status)
        );
        return response;
      } catch (err) {
        pushToast(
          "error",
          err instanceof Error ? err.message : "Network error. Please try again."
        );
        throw err;
      } finally {
        end();
      }
    };

    return () => {
      window.fetch = originalFetch;
      if (hideLoaderTimerRef.current) {
        clearTimeout(hideLoaderTimerRef.current);
      }
      for (const timer of toastTimers.current.values()) {
        clearTimeout(timer);
      }
      toastTimers.current.clear();
    };
  }, [begin, end, pushToast]);

  return (
    <MutationContext.Provider value={{ pendingCount, pushToast }}>
      {children}

      <AnimatePresence>
        {showLoader ? (
          <>
            <motion.div
              key="mutation-backdrop"
              className="fixed inset-0 z-[200] bg-navy/10 backdrop-blur-[1px] pointer-events-none"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              aria-hidden
            />
            <motion.div
              key="mutation-bar-track"
              className="mutation-progress fixed inset-x-0 top-0 z-[210] h-1.5 overflow-hidden border-b border-brand/20 bg-navy/15 shadow-[0_2px_12px_rgba(0,166,166,0.35)]"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.15 }}
              aria-hidden
            >
              <div className="mutation-progress-bar h-full w-[38%] rounded-full bg-brand shadow-[0_0_10px_var(--teal)]" />
            </motion.div>
            <motion.div
              key="mutation-pill"
              role="status"
              aria-live="polite"
              aria-busy="true"
              className="fixed left-1/2 top-[4.5rem] z-[210] flex -translate-x-1/2 items-center gap-3 rounded-full border border-brand/30 bg-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-[0_10px_40px_-10px_rgba(11,31,58,0.45)] sm:top-20"
              initial={reduce ? false : { opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
            >
              <MutationSpinner className="h-5 w-5 text-brand" />
              <span>Processing…</span>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[120] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
        aria-live="polite"
        aria-relevant="additions"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              role="status"
              initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm ${
                toast.kind === "success"
                  ? "border-brand/30 bg-surface text-foreground"
                  : "border-danger/30 bg-surface text-foreground"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex h-2 w-2 shrink-0 rounded-full ${
                  toast.kind === "success" ? "bg-brand" : "bg-danger"
                }`}
                aria-hidden
              />
              <p className="flex-1 text-sm leading-snug">{toast.message}</p>
              <button
                type="button"
                className="shrink-0 rounded p-1 text-muted hover:bg-surface-dark hover:text-foreground"
                aria-label="Dismiss notification"
                onClick={() => dismissToast(toast.id)}
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </MutationContext.Provider>
  );
}

export function useMutationFeedback() {
  const ctx = useContext(MutationContext);
  if (!ctx) {
    throw new Error("useMutationFeedback must be used within MutationProvider");
  }
  return ctx;
}
