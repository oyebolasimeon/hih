"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ChatPanel from "@/components/chat/ChatPanel";

function shouldHide(pathname: string) {
  return (
    pathname.startsWith("/portal") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  );
}

export default function PublicChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (shouldHide(pathname)) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="w-[min(100vw-2rem,24rem)] h-[min(70vh,36rem)]">
          <ChatPanel
            title="Ask House In Hands"
            subtitle="Properties, platform & how it works"
            endpoint="/api/public/chat"
            emptyHint="Ask about listings, renting in Nigeria, fees, or how House In Hands works."
            disclaimer="AI can be wrong. Not legal advice."
            starterPrompts={[
              "What is House In Hands?",
              "How do I find a home in Lagos?",
              "Are listings verified?",
              "Show me apartment options you know about",
            ]}
            onClose={() => setOpen(false)}
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-[#0c0d0b] shadow-lg hover:brightness-105 transition"
        aria-expanded={open}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0c0d0b]/10">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3c4.97 0 9 3.58 9 8 0 2.12-.9 4.05-2.37 5.5L20 21l-4.1-1.37A9.7 9.7 0 0112 19c-4.97 0-9-3.58-9-8s4.03-8 9-8zm-3.25 7.25a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5zm3.25 0a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5zm3.25 0a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5z" />
          </svg>
        </span>
        {open ? "Close" : "Ask AI"}
      </button>
    </div>
  );
}
