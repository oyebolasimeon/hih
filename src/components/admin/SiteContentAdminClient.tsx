"use client";

import { useState } from "react";
import InvestorModalContentClient from "@/components/admin/InvestorModalContentClient";
import AuthBackgroundClient from "@/components/admin/AuthBackgroundClient";

type Tab = "modal" | "auth-bg";

export default function SiteContentAdminClient() {
  const [tab, setTab] = useState<Tab>("auth-bg");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Site content
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Control the investor login modal on the marketing site and the
          background image on all auth pages.
        </p>
      </div>

      <div
        className="inline-flex rounded-md border border-border p-0.5 bg-surface gap-0.5"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "auth-bg"}
          onClick={() => setTab("auth-bg")}
          className={`px-3 py-1.5 text-xs font-medium rounded ${
            tab === "auth-bg"
              ? "bg-brand text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          Auth background
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "modal"}
          onClick={() => setTab("modal")}
          className={`px-3 py-1.5 text-xs font-medium rounded ${
            tab === "modal"
              ? "bg-brand text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          Login modal
        </button>
      </div>

      {tab === "auth-bg" ? <AuthBackgroundClient /> : <InvestorModalContentClient />}
    </div>
  );
}
