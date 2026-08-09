"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthCard from "@/components/auth/AuthCard";

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Unable to reset password.");
      return;
    }

    router.push("/login");
  }

  if (!token) {
    return (
      <AuthCard title="Invalid link" subtitle="This password reset link is missing or invalid.">
        <Link href="/forgot-password" className="app-btn app-btn-primary">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset password" subtitle="Choose a new password for your account.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1.5">
            New password
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
        </div>
        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={loading} className="app-btn app-btn-primary w-full">
          {loading ? "Saving…" : "Update password"}
        </button>
      </form>
    </AuthCard>
  );
}
