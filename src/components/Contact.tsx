"use client";

import { FormEvent, useState } from "react";

export default function Contact() {
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const form = e.currentTarget;
    const data = new FormData(form);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
        }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("err");
    }
  }

  return (
    <section className="site-section bg-sand">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
        <div>
          <p className="site-kicker">Contact</p>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-navy sm:text-5xl">
            We&apos;re here for the hard part of housing
          </h1>
          <p className="mt-5 text-muted leading-relaxed text-lg max-w-md">
            Questions about listings, verification, or partnerships — write us.
            We respond on business days.
          </p>
          <div className="mt-10 space-y-2 text-sm text-navy/70">
            <p>
              <a
                href="mailto:hello@houseinhand.com"
                className="text-teal-dark font-semibold hover:underline"
              >
                hello@houseinhand.com
              </a>
            </p>
            <p>Lagos · Abuja · Nationwide</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="bg-surface border border-border p-6 sm:p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Name</label>
            <input name="name" required className="app-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Email</label>
            <input name="email" type="email" required className="app-input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">Message</label>
            <textarea name="message" required rows={5} className="app-input resize-y" />
          </div>
          <button
            type="submit"
            disabled={status === "sending"}
            className="site-btn site-btn-teal w-full sm:w-auto"
          >
            {status === "sending" ? "Sending…" : "Send message"}
          </button>
          {status === "ok" ? (
            <p className="text-sm text-teal-dark">Thanks — we&apos;ll be in touch.</p>
          ) : null}
          {status === "err" ? (
            <p className="text-sm text-danger">Couldn&apos;t send. Try again shortly.</p>
          ) : null}
        </form>
      </div>
    </section>
  );
}
