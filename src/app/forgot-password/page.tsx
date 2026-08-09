"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Unable to send reset email.");
      return;
    }

    setMessage(data.message);
  }

  return (
    <AuthCard
      title="Forgot password"
      subtitle="Enter your email and we’ll send a reset link if an account exists."
      footer={
        <p>
          <Link href="/login" className="text-brand-dark font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="app-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-foreground" role="status">
            {message}
          </p>
        ) : null}
        <button type="submit" disabled={loading} className="app-btn app-btn-primary w-full">
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </AuthCard>
  );
}
