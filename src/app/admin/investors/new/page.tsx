"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type FoundInvestor = {
  id: string;
  name: string;
  email: string;
  portfolioValue: number;
};

export default function OnboardPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<FoundInvestor | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const res = await fetch(
      `/api/admin/investors?q=${encodeURIComponent(email.trim())}`
    );
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Lookup failed.");
      return;
    }

    const match = (data.investors || []).find(
      (inv: FoundInvestor) =>
        inv.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!match) {
      setError(
        "No registered investor found for that email. Ask them to create an account first (signup-first)."
      );
      return;
    }

    setResult(match);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          ← Investors
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-display font-semibold">
          Find / onboard investor
        </h1>
        <p className="mt-1 text-sm text-muted">
          Investors register first. Locate their account by email, then enrich
          their portfolio in the detail view.
        </p>
      </div>

      <form onSubmit={onSubmit} className="app-card p-5 space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1.5">
            Investor email
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
        <button type="submit" disabled={loading} className="app-btn app-btn-primary">
          {loading ? "Searching…" : "Find investor"}
        </button>
      </form>

      {result ? (
        <div className="app-card p-5">
          <p className="font-semibold">{result.name}</p>
          <p className="text-sm text-muted">{result.email}</p>
          <button
            type="button"
            className="app-btn app-btn-primary mt-4"
            onClick={() => router.push(`/admin/investors/${result.id}`)}
          >
            Open investor detail
          </button>
        </div>
      ) : null}
    </div>
  );
}
