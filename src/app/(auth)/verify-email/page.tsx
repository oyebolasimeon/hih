"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";

function VerifyEmailInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Verifying your email…");

  useEffect(() => {
    if (!token) {
      setError("Missing verification token. Open the link from your email.");
      setStatus("");
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || "Unable to verify email.");
          setStatus("");
          return;
        }

        setStatus(data.message || "Email verified. Signing you in…");

        const result = await signIn("credentials", {
          email: data.email,
          autoLoginToken: data.autoLoginToken,
          redirect: false,
        });

        if (cancelled) return;

        if (result?.error) {
          setError("Verified, but auto sign-in failed. Please sign in manually.");
          setStatus("");
          return;
        }

        router.replace("/portal");
        router.refresh();
      } catch {
        if (!cancelled) {
          setError("Something went wrong while verifying. Please try again.");
          setStatus("");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  return (
    <AuthCard
      title="Verify email"
      subtitle="Confirming your Nova Elite Homes account."
      footer={
        <p>
          <Link href="/login" className="text-brand font-medium hover:underline">
            Sign in
          </Link>
          {" · "}
          <Link href="/register" className="text-muted hover:text-foreground">
            Create account
          </Link>
        </p>
      }
    >
      <div className="space-y-3">
        {status ? (
          <p className="text-sm text-foreground" role="status">
            {status}
          </p>
        ) : null}
        {error ? (
          <div className="space-y-3">
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
            <Link href="/login" className="app-btn app-btn-primary w-full text-center">
              Go to sign in
            </Link>
          </div>
        ) : null}
      </div>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Verify email" subtitle="Loading…">
          <p className="text-sm text-muted">Please wait…</p>
        </AuthCard>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
