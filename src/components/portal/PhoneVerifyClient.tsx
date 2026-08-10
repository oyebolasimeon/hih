"use client";

import { FormEvent, useEffect, useState } from "react";

type Props = {
  initialPhone?: string;
  onVerified?: (phone: string) => void;
};

export default function PhoneVerifyClient({
  initialPhone = "",
  onVerified,
}: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [channel, setChannel] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    setPhone(initialPhone);
  }, [initialPhone]);

  async function sendOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/phone/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not send OTP.");
      return;
    }
    setSent(true);
    setChannel(data.channel || "email");
    setMessage(data.message || "OTP sent.");
  }

  async function verifyOtp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/phone/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Could not verify OTP.");
      return;
    }
    setVerified(true);
    setMessage("Phone verified.");
    onVerified?.(data.phone || phone);
  }

  return (
    <section className="app-card p-5 space-y-4">
      <div>
        <h2 className="font-semibold">Verify phone</h2>
        <p className="text-xs text-muted mt-1">
          OTP is sent to your account email when SMS is not configured.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}
      {verified ? (
        <p className="text-sm text-muted">Phone number verified for this account.</p>
      ) : (
        <>
          <form onSubmit={sendOtp} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="otp-phone">
                Phone number
              </label>
              <input
                id="otp-phone"
                type="tel"
                className="app-input w-full"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 801 234 5678"
                required
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="app-btn app-btn-secondary text-sm"
            >
              {busy && !sent ? "Sending…" : "Send OTP"}
            </button>
          </form>

          {sent ? (
            <form onSubmit={verifyOtp} className="space-y-3 border-t border-border pt-4">
              <p className="text-xs text-muted">
                Enter the 6-digit code
                {channel === "email" ? " from your email" : ""}.
              </p>
              <input
                className="app-input w-full tracking-widest"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                required
              />
              <button
                type="submit"
                disabled={busy}
                className="app-btn app-btn-primary text-sm"
              >
                {busy ? "Verifying…" : "Verify phone"}
              </button>
            </form>
          ) : null}
        </>
      )}
    </section>
  );
}
