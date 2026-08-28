"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/motion/Motion";

type ProfileType = "student" | "tenant" | "landlord" | "estate_manager";

type ProfileRow = {
  id: string;
  type: ProfileType;
  status: string;
  displayName: string;
  phone?: string;
  verifiedAt?: string | null;
  createdAt?: string;
};

const TYPE_OPTIONS = [
  { value: "tenant", label: "Tenant" },
  { value: "student", label: "Student" },
  { value: "landlord", label: "Landlord" },
  { value: "estate_manager", label: "Estate Manager" },
] as const;

const TYPE_META: Record<
  ProfileType,
  { label: string; short: string; description: string; accent: string }
> = {
  tenant: {
    label: "Tenant",
    short: "T",
    description: "Pay rent, sign agreements, and manage your tenancy.",
    accent: "from-brand/15 to-brand/5 border-brand/25 text-brand-dark",
  },
  student: {
    label: "Student",
    short: "S",
    description: "Find and rent student-friendly accommodation.",
    accent: "from-teal/15 to-teal/5 border-teal/25 text-brand-dark",
  },
  landlord: {
    label: "Landlord",
    short: "L",
    description: "List properties, collect rent, and manage payouts.",
    accent: "from-amber-500/15 to-amber-500/5 border-amber-500/25 text-amber-900 dark:text-amber-100",
  },
  estate_manager: {
    label: "Estate Manager",
    short: "E",
    description: "Manage multiple properties and tenants on behalf of owners.",
    accent: "from-violet-500/15 to-violet-500/5 border-violet-500/25 text-violet-900 dark:text-violet-100",
  },
};

function formatType(type: ProfileType) {
  return TYPE_META[type]?.label || type.replace("_", " ");
}

function statusLabel(status: string) {
  if (status === "verified") return "Verified";
  if (status === "pending_kyc") return "KYC pending";
  if (status === "draft") return "Draft";
  if (status === "rejected") return "Rejected";
  if (status === "suspended") return "Suspended";
  return status.replace(/_/g, " ");
}

function statusClass(status: string) {
  if (status === "verified") {
    return "bg-teal/15 text-brand-dark border-teal/30";
  }
  if (status === "pending_kyc" || status === "draft") {
    return "bg-brand/10 text-brand-dark border-brand/25";
  }
  if (status === "rejected" || status === "suspended") {
    return "bg-danger/10 text-danger border-danger/30";
  }
  return "bg-surface text-muted border-border";
}

export default function ProfilesClient() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<ProfileType>("tenant");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [switchingId, setSwitchingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/profiles");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load profiles.");
      setProfiles([]);
      return;
    }
    setProfiles(data.profiles || []);
    setActiveProfileId(data.activeProfileId || null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) || null,
    [profiles, activeProfileId]
  );

  const verifiedCount = useMemo(
    () => profiles.filter((p) => p.status === "verified").length,
    [profiles]
  );

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
    setMessage(`${formatType(type)} profile created. Complete KYC to unlock full access.`);
    await load();
  }

  async function onSwitch(profileId: string) {
    setSwitchingId(profileId);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/profiles/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId }),
    });
    const data = await res.json();
    setSwitchingId("");
    if (!res.ok) {
      setError(data.error || "Could not switch profile.");
      return;
    }
    setActiveProfileId(data.activeProfileId);
    setMessage("Active profile updated.");
  }

  const createdTypes = new Set(profiles.map((p) => p.type));
  const availableTypes = TYPE_OPTIONS.filter(
    (t) => !createdTypes.has(t.value as ProfileType)
  );

  useEffect(() => {
    if (availableTypes.length === 0) return;
    if (!availableTypes.some((t) => t.value === type)) {
      setType(availableTypes[0].value as ProfileType);
    }
  }, [availableTypes, type]);

  if (loading) {
    return <FormSkeleton />;
  }

  if (error && profiles.length === 0) {
    return (
      <EmptyState
        title="Could not load profiles"
        description={error}
      >
        <button
          type="button"
          onClick={() => void load()}
          className="app-btn app-btn-primary text-sm"
        >
          Retry
        </button>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p
          className="text-sm text-danger rounded-md border border-danger/20 bg-danger/5 px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="text-sm text-brand-dark rounded-md border border-brand/20 bg-brand/5 px-3 py-2"
          role="status"
        >
          {message}
        </p>
      ) : null}

      <Reveal>
        <section className="app-card overflow-hidden">
          <div className="px-5 py-6 border-b border-border/60 bg-gradient-to-br from-brand/10 via-transparent to-teal/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Active profile
                </p>
                {activeProfile ? (
                  <>
                    <p className="font-display text-xl font-semibold mt-1">
                      {activeProfile.displayName}
                    </p>
                    <p className="text-sm text-muted mt-0.5">
                      {formatType(activeProfile.type)}
                    </p>
                  </>
                ) : (
                  <p className="font-display text-xl font-semibold mt-1">
                    None selected
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeProfile ? (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusClass(activeProfile.status)}`}
                    >
                      {statusLabel(activeProfile.status)}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                    {profiles.length} profile{profiles.length === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-dark">
                    {verifiedCount} verified
                  </span>
                </div>
              </div>
              <Link href="/portal/account" className="app-btn app-btn-secondary text-xs">
                Account settings
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      <div className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6 items-start">
        <Reveal delay={0.04}>
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Your profiles</h2>
              <p className="text-sm text-muted mt-1">
                Switch between roles to access the right tools in the portal.
              </p>
            </div>

            {profiles.length === 0 ? (
              <EmptyState
                title="No profiles yet"
                description="Create your first profile to start renting, listing, or managing properties on House In Hand."
              />
            ) : (
              <ul className="grid sm:grid-cols-2 gap-3">
                {profiles.map((p) => {
                  const active = activeProfileId === p.id;
                  const meta = TYPE_META[p.type];
                  return (
                    <li
                      key={p.id}
                      className={`app-card overflow-hidden h-full flex flex-col ${
                        active ? "ring-2 ring-brand/40 border-brand/40" : ""
                      }`}
                    >
                      <div
                        className={`px-4 py-3 border-b border-border/60 bg-gradient-to-br ${meta.accent}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/80 border border-border/50 font-display font-semibold">
                            {meta.short}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium truncate">{p.displayName}</p>
                              {active ? (
                                <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-dark">
                                  Active
                                </span>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted mt-0.5">{meta.label}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 flex-1 flex flex-col gap-3">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusClass(p.status)}`}
                          >
                            {statusLabel(p.status)}
                          </span>
                        </div>
                        <p className="text-xs text-muted leading-relaxed">
                          {meta.description}
                        </p>

                        <div className="mt-auto flex flex-wrap gap-2 pt-1">
                          {p.status !== "verified" ? (
                            <Link
                              href={`/portal/kyc?profileId=${p.id}`}
                              className="app-btn app-btn-primary text-xs"
                            >
                              Complete KYC
                            </Link>
                          ) : null}
                          {!active ? (
                            <button
                              type="button"
                              className="app-btn app-btn-secondary text-xs"
                              disabled={switchingId === p.id}
                              onClick={() => void onSwitch(p.id)}
                            >
                              {switchingId === p.id ? "Switching…" : "Use this profile"}
                            </button>
                          ) : (
                            <span className="text-xs text-brand-dark font-medium self-center">
                              Currently in use
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </Reveal>

        <Reveal delay={0.08}>
          <section className="app-card overflow-hidden lg:sticky lg:top-6">
            <div className="px-5 py-5 border-b border-border/60">
              <h2 className="font-display text-lg font-semibold">Add a profile</h2>
              <p className="text-sm text-muted mt-1">
                One profile per role. KYC is required separately for each.
              </p>
            </div>

            {availableTypes.length > 0 ? (
              <form onSubmit={onCreate} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Profile type
                  </label>
                  <Select
                    value={type}
                    onChange={(v) => setType(v as ProfileType)}
                    options={availableTypes.map((t) => ({
                      value: t.value,
                      label: t.label,
                    }))}
                  />
                  <p className="text-xs text-muted mt-2 leading-relaxed">
                    {TYPE_META[type]?.description}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Display name
                    <span className="text-muted font-normal"> (optional)</span>
                  </label>
                  <input
                    className="app-input w-full"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="How you appear on listings and agreements"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="app-btn app-btn-primary text-sm w-full sm:w-auto"
                >
                  {submitting ? "Creating…" : "Create profile"}
                </button>
              </form>
            ) : (
              <div className="p-5">
                <p className="text-sm text-muted">
                  You have all four profile types under this account. Switch
                  between them above or manage your account details.
                </p>
                <Link
                  href="/portal/account"
                  className="app-btn app-btn-secondary text-xs mt-4 inline-flex"
                >
                  Go to account
                </Link>
              </div>
            )}
          </section>
        </Reveal>
      </div>
    </div>
  );
}
