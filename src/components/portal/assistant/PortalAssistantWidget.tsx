"use client";

import { useState } from "react";
import ChatPanel from "@/components/chat/ChatPanel";

export default function PortalAssistantWidget() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <div className="w-[min(100vw-2rem,26rem)] h-[min(72vh,38rem)]">
          <ChatPanel
            title="Your AI Assistant"
            subtitle="Manage, remind, receipts, forecasts & tips"
            endpoint="/api/portal/assistant"
            emptyHint="I can help with your leases, bills, receipts, spending outlook, building issues and next steps — but I don’t give legal advice."
            disclaimer="Not legal advice. Confirm important actions in the portal."
            starterPrompts={[
              "What rent do I owe right now?",
              "Find my latest rent receipt",
              "Forecast my property spending next month",
              "What should I do on my open building issues?",
              "Remind me what to check before exiting a lease",
            ]}
            onClose={() => setOpen(false)}
            storageKey="hih-portal-ai-lang"
          />
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand px-4 py-3 text-sm font-semibold text-[#0c0d0b] shadow-lg hover:brightness-105 transition"
        aria-expanded={open}
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0c0d0b]/10">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 3a1 1 0 00-1 1v1H6a3 3 0 00-3 3v9a3 3 0 003 3h12a3 3 0 003-3V8a3 3 0 00-3-3h-2V4a1 1 0 00-1-1H9zm1 2h4v1h-4V5zm-4 4h12v8a1 1 0 01-1 1H6a1 1 0 01-1-1V9zm3.5 2a1 1 0 100 2h5a1 1 0 100-2h-5zm0 3a1 1 0 100 2h3a1 1 0 100-2h-3z" />
          </svg>
        </span>
        {open ? "Close assistant" : "AI Assistant"}
      </button>
    </div>
  );
}
