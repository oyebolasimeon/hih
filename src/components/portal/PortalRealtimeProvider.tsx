"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";
import { playMessageSound } from "@/lib/notify-sound";
import type { LiveMessageEvent } from "@/lib/realtime/types";

type Handler = (event: LiveMessageEvent) => void;

type Ctx = {
  pushEnabled: boolean;
  pushPermission: NotificationPermission | "unsupported";
  enablePush: () => Promise<boolean>;
  subscribeMessages: (handler: Handler) => () => void;
};

const RealtimeCtx = createContext<Ctx | null>(null);

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function PortalRealtimeProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const handlersRef = useRef(new Set<Handler>());
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const lastSoundAt = useRef(0);

  const dispatch = useCallback((event: LiveMessageEvent) => {
    handlersRef.current.forEach((h) => h(event));

    const mine = event.message.fromUserId === session?.user?.id;
    if (mine) return;

    const now = Date.now();
    if (now - lastSoundAt.current > 800) {
      lastSoundAt.current = now;
      playMessageSound();
    }

    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted" &&
      document.visibilityState === "hidden"
    ) {
      try {
        const n = new Notification(event.preview ? "New message" : "House In Hands", {
          body: event.preview || event.message.body,
          icon: "/favicon.png",
          tag: `msg-${event.conversationId}`,
        });
        n.onclick = () => {
          window.focus();
          window.location.href = `/portal/messages?c=${event.conversationId}`;
          n.close();
        };
      } catch {
        /* Safari private mode etc */
      }
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      es = new EventSource("/api/portal/messages/stream");
      es.addEventListener("message", (ev) => {
        try {
          const data = JSON.parse(ev.data) as LiveMessageEvent;
          if (data?.type === "message" && data.message) dispatch(data);
        } catch {
          /* ignore */
        }
      });
      es.onerror = () => {
        es?.close();
        es = null;
        if (!stopped) {
          retryTimer = setTimeout(connect, 3000);
        }
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      es?.close();
    };
  }, [status, session?.user?.id, dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushPermission("unsupported");
      return;
    }
    setPushPermission(Notification.permission);

    void (async () => {
      try {
        const res = await fetch("/api/portal/push");
        const data = await res.json();
        setPushEnabled(Boolean(data.enabled && data.publicKey));
        if (data.enabled && Notification.permission === "granted") {
          await navigator.serviceWorker.register("/sw.js");
        }
      } catch {
        setPushEnabled(false);
      }
    })();
  }, []);

  const enablePush = useCallback(async () => {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushPermission("unsupported");
      return false;
    }

    const permission = await Notification.requestPermission();
    setPushPermission(permission);
    if (permission !== "granted") return false;

    const meta = await fetch("/api/portal/push").then((r) => r.json());
    if (!meta.publicKey) {
      setPushEnabled(false);
      return false;
    }

    const reg = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(meta.publicKey),
      });
    }

    const json = sub.toJSON();
    const res = await fetch("/api/portal/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });
    const ok = res.ok;
    setPushEnabled(ok);
    return ok;
  }, []);

  const subscribeMessages = useCallback((handler: Handler) => {
    handlersRef.current.add(handler);
    return () => {
      handlersRef.current.delete(handler);
    };
  }, []);

  const value = useMemo(
    () => ({
      pushEnabled,
      pushPermission,
      enablePush,
      subscribeMessages,
    }),
    [pushEnabled, pushPermission, enablePush, subscribeMessages]
  );

  return (
    <RealtimeCtx.Provider value={value}>{children}</RealtimeCtx.Provider>
  );
}

export function usePortalRealtime() {
  const ctx = useContext(RealtimeCtx);
  if (!ctx) {
    return {
      pushEnabled: false,
      pushPermission: "unsupported" as const,
      enablePush: async () => false,
      subscribeMessages: () => () => undefined,
    };
  }
  return ctx;
}
