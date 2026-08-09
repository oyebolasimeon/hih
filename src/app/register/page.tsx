"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingVerify, setPendingVerify] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [resending, setResending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setStatusMessage("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Unable to create account.");
        return;
      }

      setPendingVerify(true);
      setStatusMessage(
        data.message ||
          "Check your email for a verification link to finish signing up."
      );
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setResending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Unable to resend email.");
        return;
      }
      setStatusMessage(data.message || "Verification email sent.");
    } catch {
      setError("Unable to resend email. Please try again.");
    } finally {
      setResending(false);
    }
  }

  if (pendingVerify) {
    return (
      <AuthCard
        title="Check your email"
        subtitle="We sent a verification link to finish creating your account."
        footer={
          <p>
            Wrong email?{" "}
            <button
              type="button"
              className="text-brand font-medium hover:underline"
              onClick={() => {
                setPendingVerify(false);
                setStatusMessage("");
                setError("");
              }}
            >
              Go back
            </button>
          </p>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Open the link in <span className="text-foreground font-medium">{email}</span>{" "}
            to verify and sign in. The link expires in 24 hours.
          </p>
          {statusMessage ? (
            <p className="text-sm text-foreground" role="status">
              {statusMessage}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            className="app-btn app-btn-secondary w-full"
            disabled={resending}
            onClick={() => void resend()}
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
          <Link
            href="/login"
            className="block text-center text-sm text-muted hover:text-foreground"
          >
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create account"
      subtitle="Sign up to access your investor portal. Verify your email to continue."
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="text-brand font-medium hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1.5">
            Full name
          </label>
          <input
            id="name"
            required
            minLength={2}
            className="app-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
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
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            className="app-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="app-btn app-btn-primary w-full"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthCard>
  );
}
