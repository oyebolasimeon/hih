"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import PhoneVerifyClient from "@/components/portal/PhoneVerifyClient";
import { Reveal } from "@/components/motion/Motion";

type Profile = {
  name: string;
  email: string;
  phone: string;
  phoneVerified?: boolean;
  emailNotifications: boolean;
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("") || "?"
  );
}

export default function AccountSettings({
  title = "Account",
  subtitle = "Manage your profile, notifications, theme, and password.",
  hideHeader = false,
}: {
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
}) {
  const { data: session, update } = useSession();
  const pathname = usePathname();
  const isPortal = pathname.startsWith("/portal");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/account");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load account.");
      setProfile(null);
      return;
    }
    setProfile(data.profile);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const avatar = useMemo(
    () => initials(profile?.name || session?.user?.name || "?"),
    [profile?.name, session?.user?.name]
  );

  async function persistProfile(
    patch: Partial<Pick<Profile, "name" | "phone" | "emailNotifications">>,
    successMessage?: string
  ) {
    if (!profile) return false;
    setSaving(true);
    setError("");
    setMessage("");
    const payload = {
      name: patch.name ?? profile.name,
      phone: patch.phone ?? profile.phone,
      emailNotifications: patch.emailNotifications ?? profile.emailNotifications,
    };
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Unable to save changes.");
      return false;
    }
    setProfile(data.profile);
    if (data.profile?.name) {
      await update({ name: data.profile.name });
    }
    if (successMessage) setMessage(successMessage);
    return true;
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    await persistProfile(
      { name: profile.name, phone: profile.phone },
      "Profile saved."
    );
  }

  async function toggleEmailNotifications() {
    if (!profile) return;
    const next = !profile.emailNotifications;
    setProfile({ ...profile, emailNotifications: next });
    const ok = await persistProfile({ emailNotifications: next });
    if (!ok) {
      setProfile({ ...profile, emailNotifications: !next });
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setChangingPassword(true);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setChangingPassword(false);
    if (!res.ok) {
      setError(data.error || "Unable to change password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Password updated.");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {!hideHeader ? <PageHeaderSkeleton /> : null}
        <FormSkeleton />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        {!hideHeader ? (
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-semibold">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted">{subtitle}</p>
          </div>
        ) : null}
        <EmptyState
          title="Could not load account"
          description={error || "Something went wrong. Try again in a moment."}
        >
          <button
            type="button"
            onClick={() => void load()}
            className="app-btn app-btn-primary text-sm"
          >
            Retry
          </button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!hideHeader ? (
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted max-w-2xl">{subtitle}</p>
        </div>
      ) : null}

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
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand/15 text-lg font-display font-semibold text-brand-dark border border-brand/20">
                {avatar}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl font-semibold truncate">
                  {profile.name}
                </p>
                <p className="text-sm text-muted truncate">{profile.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.phoneVerified ? (
                    <span className="rounded-full border border-teal/30 bg-teal/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-dark">
                      Phone verified
                    </span>
                  ) : (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
                      Phone not verified
                    </span>
                  )}
                  {session?.user?.isAdmin ? (
                    <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-dark">
                      Admin
                    </span>
                  ) : null}
                </div>
              </div>
              {isPortal ? (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/portal/profiles"
                    className="app-btn app-btn-secondary text-xs"
                  >
                    Manage profiles
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </Reveal>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <Reveal delay={0.04}>
          <form onSubmit={saveProfile} className="app-card overflow-hidden h-fit">
            <div className="px-5 py-5 border-b border-border/60">
              <h2 className="font-display text-lg font-semibold">Profile</h2>
              <p className="text-sm text-muted mt-1">
                Your name and contact details used across House In Hand.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="name">
                  Full name
                </label>
                <input
                  id="name"
                  className="app-input w-full"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                />
              </div>
              <div className="rounded-lg border border-border/60 bg-surface/40 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Email
                </p>
                <p className="mt-1 font-medium break-all">{profile.email}</p>
                <p className="mt-1 text-xs text-muted">
                  Sign-in email cannot be changed here.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="phone">
                  Phone number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="app-input w-full"
                  placeholder="+234 801 234 5678"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  autoComplete="tel"
                />
                {!profile.phoneVerified ? (
                  <p className="mt-1 text-xs text-muted">
                    Save your number, then verify it in the section below.
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                className="app-btn app-btn-primary text-sm"
                disabled={saving}
              >
                {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          </form>
        </Reveal>

        <Reveal delay={0.08}>
          <div className="space-y-6">
            <section className="app-card overflow-hidden">
              <div className="px-5 py-5 border-b border-border/60">
                <h2 className="font-display text-lg font-semibold">Preferences</h2>
                <p className="text-sm text-muted mt-1">
                  Notifications and appearance for your account.
                </p>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-3">
                  <div>
                    <p className="text-sm font-medium">Email notifications</p>
                    <p className="text-xs text-muted mt-0.5">
                      Rent reminders, payment receipts, and account alerts.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={profile.emailNotifications}
                    aria-label="Toggle email notifications"
                    disabled={saving}
                    onClick={() => void toggleEmailNotifications()}
                    className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
                      profile.emailNotifications
                        ? "border-brand/40 bg-brand"
                        : "border-border bg-surface-dark"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform duration-200 ${
                        profile.emailNotifications ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 px-3 py-3">
                  <div>
                    <p className="text-sm font-medium">Appearance</p>
                    <p className="text-xs text-muted mt-0.5">
                      Light or dark mode, saved to your account.
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
              </div>
            </section>

            <form onSubmit={changePassword} className="app-card overflow-hidden">
              <div className="px-5 py-5 border-b border-border/60">
                <h2 className="font-display text-lg font-semibold">Security</h2>
                <p className="text-sm text-muted mt-1">
                  Update your password to keep your account secure.
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    htmlFor="currentPassword"
                  >
                    Current password
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    className="app-input w-full"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    htmlFor="newPassword"
                  >
                    New password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    className="app-input w-full"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    htmlFor="confirmPassword"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className="app-input w-full"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <button
                  type="submit"
                  className="app-btn app-btn-primary text-sm"
                  disabled={changingPassword}
                >
                  {changingPassword ? "Updating…" : "Update password"}
                </button>
                <p className="text-xs text-muted">
                  Forgot your password?{" "}
                  <Link
                    href="/forgot-password"
                    className="text-brand font-medium hover:underline"
                  >
                    Request a reset link
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </Reveal>
      </div>

      {!profile.phoneVerified ? (
        <Reveal delay={0.12}>
          <PhoneVerifyClient
            initialPhone={profile.phone}
            onVerified={(phone) => {
              setProfile({ ...profile, phone, phoneVerified: true });
              setMessage("Phone verified.");
            }}
          />
        </Reveal>
      ) : null}
    </div>
  );
}
