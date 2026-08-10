"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { FormSkeleton } from "@/components/ui/Skeleton";

type ProfileType = "student" | "tenant" | "landlord" | "estate_manager";

type ProfileRow = {
  id: string;
  type: ProfileType;
  status: string;
  displayName: string;
  phone?: string;
  verifiedAt?: string | null;
};

const TYPE_OPTIONS = [
  { value: "tenant", label: "Tenant" },
  { value: "student", label: "Student" },
  { value: "landlord", label: "Landlord" },
  { value: "estate_manager", label: "Estate Manager" },
];

export default function ProfilesClient() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ProfileType>("tenant");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/profiles");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load profiles.");
      return;
    }
    setProfiles(data.profiles || []);
    setActiveProfileId(data.activeProfileId || null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        displayName: displayName.trim() || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Could not create profile.");
      return;
    }
    setDisplayName("");
    setMessage(`${TYPE_OPTIONS.find((t) => t.value === type)?.label} profile created.`);
    await load();
  }

  async function onSwitch(profileId: string) {
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/profiles/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not switch profile.");
      return;
    }
    setActiveProfileId(data.activeProfileId);
    setMessage("Active profile updated.");
  }

  const createdTypes = new Set(profiles.map((p) => p.type));
  const availableTypes = TYPE_OPTIONS.filter((t) => !createdTypes.has(t.value as ProfileType));

  if (loading) {
    return <FormSkeleton />;
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Your profiles</h2>
        {profiles.length === 0 ? (
          <EmptyState
            title="No profiles yet"
            description="Create a Tenant, Student, Landlord, or Estate Manager profile. One of each type is allowed."
          />
        ) : (
          <ul className="space-y-2">
            {profiles.map((p) => {
              const active = activeProfileId === p.id;
              return (
                <li
                  key={p.id}
                  className={`app-card p-4 flex flex-wrap items-center justify-between gap-3 ${
                    active ? "border-brand/50" : ""
                  }`}
                >
                  <div>
                    <p className="font-medium capitalize">
                      {p.type.replace("_", " ")}
                      {active ? (
                        <span className="ml-2 text-[11px] uppercase tracking-wider text-brand font-semibold">
                          Active
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted">{p.displayName}</p>
                    <p className="text-xs text-muted mt-1">Status: {p.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.status !== "verified" ? (
                      <Link
                        href={`/portal/kyc?profileId=${p.id}`}
                        className="app-btn app-btn-primary text-xs"
                      >
                        Verify KYC
                      </Link>
                    ) : (
                      <span className="text-xs text-brand-dark font-medium self-center">
                        Verified
                      </span>
                    )}
                    {!active ? (
                      <button
                        type="button"
                        className="app-btn app-btn-secondary text-xs"
                        onClick={() => void onSwitch(p.id)}
                      >
                        Switch to this profile
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {availableTypes.length > 0 ? (
        <section className="app-card p-4 sm:p-6 space-y-4">
          <h2 className="font-display text-lg font-semibold">Add a profile</h2>
          <form onSubmit={onCreate} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1.5">Profile type</label>
              <Select
                value={type}
                onChange={(v) => setType(v as ProfileType)}
                options={availableTypes}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Display name (optional)
              </label>
              <input
                className="app-input w-full"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="How you appear on the platform"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="app-btn app-btn-primary text-sm"
            >
              {submitting ? "Creating…" : "Create profile"}
            </button>
          </form>
        </section>
      ) : (
        <p className="text-sm text-muted">
          You already have all four profile types under this account.
        </p>
      )}
    </div>
  );
}
