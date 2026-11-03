"use client";

import Image from "next/image";
import { useState } from "react";

const SIGNATURES = [
  {
    id: "compact",
    title: "Compact signature",
    description:
      "Best for Gmail, Outlook, and cPanel Webmail — shorter height.",
    path: "/brand/email-signature-compact.jpg",
    filename: "house-in-hands-email-signature-compact.jpg",
  },
  {
    id: "full",
    title: "Full signature",
    description: "Larger banner for presentations or wide email footers.",
    path: "/brand/email-signature.jpg",
    filename: "house-in-hands-email-signature.jpg",
  },
] as const;

const PITCH_DECK = {
  path: "/brand/House-In-Hands-Pitch-Deck.pdf",
  filename: "House-In-Hands-Pitch-Deck.pdf",
} as const;

function absoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export default function EmailSignatureAdminClient() {
  const [copied, setCopied] = useState(false);

  async function copyHtml() {
    const src = absoluteUrl("/brand/email-signature-compact.jpg");
    const html = `<table cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a1a1a;">
  <tr>
    <td style="padding-right:12px;vertical-align:middle;">
      <img src="${src}" alt="House In Hands Limited" width="420" style="display:block;border:0;max-width:420px;height:auto;" />
    </td>
  </tr>
  <tr>
    <td style="padding-top:8px;color:#008585;">
      <strong>House In Hands Limited</strong><br/>
      Housing you can trust · Property. In Your Hands.<br/>
      <a href="https://www.houseinhands.com" style="color:#008585;">www.houseinhands.com</a>
      · <a href="mailto:noreply@houseinhands.com" style="color:#008585;">noreply@houseinhands.com</a>
    </td>
  </tr>
</table>`;
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="app-card p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Email signature images</h2>
          <p className="text-sm text-muted mt-1 max-w-2xl">
            Official House In Hands Limited signature assets for admin and team
            mailboxes. Download anytime and paste into cPanel Webmail, Gmail, or
            Outlook.
          </p>
        </div>
        <button
          type="button"
          className="app-btn app-btn-secondary shrink-0 text-sm"
          onClick={() => void copyHtml()}
        >
          {copied ? "HTML copied" : "Copy HTML signature"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {SIGNATURES.map((sig) => (
          <div
            key={sig.id}
            className="rounded-xl border border-border bg-surface/50 overflow-hidden flex flex-col"
          >
            <div className="relative bg-background border-b border-border p-3 flex items-center justify-center min-h-[140px]">
              <Image
                src={sig.path}
                alt={sig.title}
                width={560}
                height={140}
                className="max-h-36 w-auto max-w-full object-contain"
                unoptimized
              />
            </div>
            <div className="p-4 space-y-3 flex-1 flex flex-col">
              <div>
                <p className="font-medium text-sm">{sig.title}</p>
                <p className="text-xs text-muted mt-1">{sig.description}</p>
              </div>
              <div className="mt-auto flex flex-wrap gap-2">
                <a
                  href={sig.path}
                  download={sig.filename}
                  className="app-btn app-btn-primary text-xs"
                >
                  Download
                </a>
                <a
                  href={sig.path}
                  target="_blank"
                  rel="noreferrer"
                  className="app-btn app-btn-secondary text-xs"
                >
                  Open
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted">
        Watch words: Housing you can trust · Property. In Your Hands. · Find it.
        Rent it. Manage it. Grow it. · www.houseinhands.com
      </p>

      <div className="rounded-xl border border-border bg-surface/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Pitch deck (PDF)</p>
          <p className="text-xs text-muted mt-1">
            9-slide widescreen deck aligned to the company profile — problem,
            solution, product, mission and contact.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a
            href={PITCH_DECK.path}
            download={PITCH_DECK.filename}
            className="app-btn app-btn-primary text-xs"
          >
            Download deck
          </a>
          <a
            href={PITCH_DECK.path}
            target="_blank"
            rel="noreferrer"
            className="app-btn app-btn-secondary text-xs"
          >
            Open PDF
          </a>
        </div>
      </div>
    </section>
  );
}
