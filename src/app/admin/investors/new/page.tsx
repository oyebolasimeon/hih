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

type InviteResult = {
  id: string;
  email: string;
  name: string;
  createdAuthUser: boolean;
  inviteLink: string;
  message: string;
};

export default function OnboardPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"invite" | "find">("invite");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<FoundInvestor | null>(null);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onFind(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setInvite(null);

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
        "No investor found for that email. Use Invite to create an account."
      );
      return;
    }

    setResult(match);
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    setInvite(null);

    const res = await fetch("/api/admin/investors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Invite failed.");
      return;
    }

    setInvite(data);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          ← Investors
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-display font-semibold">
          Invite / find investor
        </h1>
        <p className="mt-1 text-sm text-muted">
          Create an account and email a password setup link, or locate someone
          who already registered.
        </p>
      </div>

      <div className="inline-flex rounded-md border border-border p-0.5 bg-surface">
        <button
          type="button"
          className={`px-3 py-1.5 text-xs font-medium rounded ${
            mode === "invite"
              ? "bg-brand text-foreground"
              : "text-muted hover:text-foreground"
          }`}
          onClick={() => setMode("invite")}
        >
          Invite
        </button>
        <button
          type="button"
          className={`px-3 py-1.5 text-xs font-medium rounded ${
            mode === "find"
              ? "bg-brand text-foreground"
              : "text-muted hover:text-foreground"
          }`}
          onClick={() => setMode("find")}
        >
          Find existing
        </button>
      </div>

      {mode === "invite" ? (
        <form onSubmit={onInvite} className="app-card p-5 space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">
              Full name
            </label>
            <input
              id="name"
              required
              className="app-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium mb-1.5">
              Phone (optional)
            </label>
            <input
              id="phone"
              className="app-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="app-btn app-btn-primary"
          >
            {loading ? "Inviting…" : "Create & send invite"}
          </button>
        </form>
      ) : (
        <form onSubmit={onFind} className="app-card p-5 space-y-4">
          <div>
            <label
              htmlFor="find-email"
              className="block text-sm font-medium mb-1.5"
            >
              Investor email
            </label>
            <input
              id="find-email"
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
          <button
            type="submit"
            disabled={loading}
            className="app-btn app-btn-primary"
          >
            {loading ? "Searching…" : "Find investor"}
          </button>
        </form>
      )}

      {invite ? (
        <div className="app-card p-5 space-y-3">
          <p className="font-semibold">{invite.name}</p>
          <p className="text-sm text-muted">{invite.email}</p>
          <p className="text-sm">{invite.message}</p>
          <div>
            <p className="text-xs text-muted mb-1">Invite / setup link</p>
            <code className="block text-xs break-all bg-surface-dark p-2 rounded border border-border">
              {invite.inviteLink}
            </code>
          </div>
          <button
            type="button"
            className="app-btn app-btn-primary"
            onClick={() => router.push(`/admin/investors/${invite.id}`)}
          >
            Open investor detail
          </button>
        </div>
      ) : null}

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
