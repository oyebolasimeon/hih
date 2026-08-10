"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";

const PROFILES = [
  {
    key: "student",
    label: "Student",
    description: "Find hostels and student-friendly homes near campus.",
  },
  {
    key: "tenant",
    label: "Tenant",
    description: "Search rentals, apply, and manage agreements in one place.",
  },
  {
    key: "landlord",
    label: "Landlord",
    description: "List properties, review applicants, and track rent.",
  },
  {
    key: "estate_manager",
    label: "Estate Manager",
    description: "Oversee estates, units, and onboarding for residents.",
  },
] as const;

type RecListing = {
  id: string;
  title: string;
  address?: { city?: string; state?: string };
  price?: { amount: number; currency: string; period: string };
};

type Props = {
  name: string;
};

export default function DashboardClient({ name }: Props) {
  const [recs, setRecs] = useState<RecListing[]>([]);
  const [recReason, setRecReason] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/portal/recommendations");
        const data = await res.json();
        if (res.ok) {
          setRecs(data.recommendations || []);
          setRecReason(data.reason || "");
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Welcome, {name}
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          House In Hand brings housing search, listings, applications, payments,
          and agreements together. Create or select a profile to get started.
        </p>
      </div>

      {recs.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-semibold">
                Recommended for you
              </h2>
              {recReason ? (
                <p className="text-sm text-muted">{recReason}</p>
              ) : null}
            </div>
            <Link
              href="/portal/search"
              className="text-sm text-brand-dark hover:underline"
            >
              Browse all
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recs.slice(0, 4).map((l) => (
              <Link
                key={l.id}
                href={`/portal/search/${l.id}`}
                className="app-card p-4 block hover:border-brand/40 transition-colors"
              >
                <h3 className="font-semibold text-sm line-clamp-2">{l.title}</h3>
                <p className="mt-1 text-xs text-muted">
                  {[l.address?.city, l.address?.state].filter(Boolean).join(", ")}
                </p>
                {l.price ? (
                  <p className="mt-2 text-sm font-medium">
                    {l.price.currency} {l.price.amount.toLocaleString()} /{" "}
                    {l.price.period}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Your profiles</h2>
        <p className="text-sm text-muted">
          Choose how you use the app — you can add more profiles later.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {PROFILES.map((profile) => (
            <Link
              key={profile.key}
              href="/portal/profiles"
              className="app-card p-4 sm:p-5 block hover:border-brand/40 transition-colors"
            >
              <h3 className="font-semibold">{profile.label}</h3>
              <p className="mt-1 text-sm text-muted">{profile.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Link href="/portal/search" className="app-btn app-btn-primary text-sm">
          Search homes
        </Link>
        <Link
          href="/portal/listings"
          className="app-btn app-btn-secondary text-sm"
        >
          My listings
        </Link>
        <Link
          href="/portal/credit"
          className="app-btn app-btn-secondary text-sm"
        >
          Credit score
        </Link>
        <Link
          href="/portal/profiles"
          className="app-btn app-btn-secondary text-sm"
        >
          Manage profiles
        </Link>
      </section>

      <EmptyState
        title="Getting started"
        description="Create a profile, complete KYC when prompted, then search homes or list a property."
      />
    </div>
  );
}
