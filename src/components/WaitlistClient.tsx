"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Select from "@/components/ui/Select";

export default function WaitlistClient() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("both");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "err">(
    "idle"
  );
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/public/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          phone: phone.trim(),
          interest,
          website: honeypot,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("err");
        setMessage(data.error || "Could not join the waitlist.");
        return;
      }
      setStatus("ok");
      setMessage(
        data.message ||
          "You're on the waitlist. We'll notify you when we launch."
      );
      setName("");
      setEmail("");
      setPhone("");
      setInterest("both");
    } catch {
      setStatus("err");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "ok") {
    return (
      <div className="rounded-2xl border border-teal/30 bg-white/80 p-6 sm:p-8 shadow-sm space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-dark">
          You're in
        </p>
        <h2 className="font-display text-2xl font-semibold text-navy">
          We'll notify you at launch
        </h2>
        <p className="text-muted leading-relaxed">{message}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/listings" className="site-btn site-btn-teal text-sm">
            Browse listings
          </Link>
          <Link href="/how-it-works" className="site-btn site-btn-outline text-sm">
            How it works
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-white/90 p-6 sm:p-8 shadow-sm space-y-4"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-dark">
          Early access
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold text-navy">
          Join the waitlist
        </h2>
        <p className="mt-2 text-sm text-muted">
          Leave your email and phone number — we'll notify you when House In
          Hands officially launches.
        </p>
      </div>

      {/* Honeypot */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />

      <div>
        <label className="block text-sm font-medium text-navy mb-1.5">
          Name <span className="text-muted font-normal">(optional)</span>
        </label>
        <input
          className="app-input w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ada Okonkwo"
          maxLength={120}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-navy mb-1.5">
          Email
        </label>
        <input
          type="email"
          required
          className="app-input w-full"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-navy mb-1.5">
          Phone number
        </label>
        <input
          type="tel"
          required
          className="app-input w-full"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+234 801 234 5678"
          autoComplete="tel"
        />
      </div>

      <Select
        label="I'm mostly interested as"
        value={interest}
        onChange={setInterest}
        options={[
          { value: "tenant", label: "Tenant / house hunting" },
          { value: "landlord", label: "Landlord / property manager" },
          { value: "both", label: "Both" },
          { value: "other", label: "Other / partner" },
        ]}
      />

      {status === "err" && message ? (
        <p className="text-sm text-danger" role="alert">
          {message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "sending"}
        className="site-btn site-btn-teal w-full sm:w-auto disabled:opacity-60"
      >
        {status === "sending" ? "Joining…" : "Notify me at launch"}
      </button>

      <p className="text-[11px] text-muted leading-relaxed">
        By joining, you agree we may contact you about the House In Hands launch.
        See our{" "}
        <Link href="/legal/privacy" className="text-teal-dark hover:underline">
          Privacy
        </Link>{" "}
        policy.
      </p>
    </form>
  );
}
