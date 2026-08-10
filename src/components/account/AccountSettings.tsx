"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";
import PhoneVerifyClient from "@/components/portal/PhoneVerifyClient";

type Profile = {
  name: string;
  email: string;
  phone: string;
  phoneVerified?: boolean;
  emailNotifications: boolean;
};

export default function AccountSettings({
  title = "Account",
  subtitle = "Manage your profile, notifications, theme, and password.",
}: {
  title?: string;
  subtitle?: string;
}) {
  const { data: session, update } = useSession();
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
      return;
    }
    setProfile(data.profile);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: profile.name,
        phone: profile.phone,
        emailNotifications: profile.emailNotifications,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Unable to save profile.");
      return;
    }
    setProfile(data.profile);
    if (data.profile?.name) {
      await update({ name: data.profile.name });
    }
    setMessage("Profile saved.");
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

  if (loading || !profile) {
    return (
      <div className="space-y-6 max-w-xl">
        <PageHeaderSkeleton />
        <FormSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          {title}
        </h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-foreground" role="status">
          {message}
        </p>
      ) : null}

      <form onSubmit={saveProfile} className="app-card p-5 space-y-5">
        <h2 className="font-semibold">Profile</h2>
        <div>
          <label className="block text-sm font-medium mb-1.5" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className="app-input"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            required
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Email</p>
          <p className="mt-1 font-medium">{profile.email}</p>
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
            className="app-input"
            placeholder="+44 7700 900000"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            autoComplete="tel"
          />
          {profile.phoneVerified ? (
            <p className="mt-1 text-xs text-muted">Phone verified</p>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Not verified — use the section below to confirm by OTP.
            </p>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-3">
          <div>
            <p className="text-sm font-medium">Email notifications</p>
            <p className="text-xs text-muted mt-0.5">
              Portfolio updates, password resets, and account notices.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={profile.emailNotifications}
            aria-label="Toggle email notifications"
            onClick={() =>
              setProfile({
                ...profile,
                emailNotifications: !profile.emailNotifications,
              })
            }
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
        <div className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-3">
          <div>
            <p className="text-sm font-medium">Appearance</p>
            <p className="text-xs text-muted mt-0.5">
              Light / dark mode (saved to your account)
            </p>
          </div>
          <ThemeToggle />
        </div>
        <button
          type="submit"
          className="app-btn app-btn-primary"
          disabled={saving}
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>

      <PhoneVerifyClient
        initialPhone={profile.phone}
        onVerified={(phone) => {
          setProfile({ ...profile, phone, phoneVerified: true });
          setMessage("Phone verified.");
        }}
      />

      <form onSubmit={changePassword} className="app-card p-5 space-y-4">
        <h2 className="font-semibold">Change password</h2>
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
            className="app-input"
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
            className="app-input"
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
            className="app-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <button
          type="submit"
          className="app-btn app-btn-primary"
          disabled={changingPassword}
        >
          {changingPassword ? "Updating…" : "Update password"}
        </button>
        <p className="text-sm text-muted">
          Prefer a reset link by email?{" "}
          <Link
            href="/forgot-password"
            className="text-brand font-medium hover:underline"
          >
            Forgot password
          </Link>
          {session?.user?.isAdmin
            ? " — works the same for investors and admins."
            : "."}
        </p>
      </form>
    </div>
  );
}
