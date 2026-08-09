"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/portal";
  const oauthError = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    oauthError === "google_email"
      ? "Google did not provide an email address for this account."
      : oauthError
        ? "Google sign-in failed. Please try again."
        : ""
  );
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    setNeedsVerify(false);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        const code = (result as { code?: string }).code || result.error;
        if (
          code === "email_not_verified" ||
          String(result.error).includes("email_not_verified")
        ) {
          setNeedsVerify(true);
          setError(
            "Please verify your email before signing in. Check your inbox for the link."
          );
        } else {
          setError("Invalid email or password.");
        }
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendVerify() {
    setResending(true);
    setInfo("");
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Unable to resend verification email.");
        return;
      }
      setInfo(data.message || "If needed, a new verification link was sent.");
    } catch {
      setError("Unable to resend verification email.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your investor dashboard"
      footer={
        <p>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-brand font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-[#0c0d0b] mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            className="app-input"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-[#0c0d0b] mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            className="app-input"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <div className="mt-2 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-brand hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="text-sm text-[#0c0d0b]" role="status">
            {info}
          </p>
        ) : null}
        {needsVerify ? (
          <button
            type="button"
            className="app-btn app-btn-secondary w-full"
            disabled={resending || !email}
            onClick={() => void resendVerify()}
          >
            {resending ? "Sending…" : "Resend verification email"}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="app-btn app-btn-primary w-full"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
        <GoogleAuthButton callbackUrl={callbackUrl} />
      </form>
    </AuthCard>
  );
}
