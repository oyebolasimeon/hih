"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import Select from "@/components/ui/Select";
import ImageFilePicker from "@/components/ui/ImageFilePicker";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { useBranding } from "@/components/providers/BrandingProvider";
import {
  BRAND_FONT_OPTIONS,
  DEFAULT_BRANDING,
  type BrandingSettings,
} from "@/lib/branding-defaults";

export default function BrandingAdminClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "content:write");
  const { refresh: refreshGlobal } = useBranding();

  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [logoFiles, setLogoFiles] = useState<File[]>([]);
  const [bgFiles, setBgFiles] = useState<File[]>([]);

  const [primary, setPrimary] = useState(DEFAULT_BRANDING.primaryColor);
  const [secondary, setSecondary] = useState(DEFAULT_BRANDING.secondaryColor);
  const [tertiary, setTertiary] = useState(DEFAULT_BRANDING.tertiaryColor);
  const [fontUi, setFontUi] = useState(DEFAULT_BRANDING.fontUi);
  const [fontDisplay, setFontDisplay] = useState(DEFAULT_BRANDING.fontDisplay);
  const [appName, setAppName] = useState(DEFAULT_BRANDING.appName);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/branding");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load branding.");
      return;
    }
    const b = data.branding as BrandingSettings;
    setBranding(b);
    setPrimary(b.primaryColor);
    setSecondary(b.secondaryColor);
    setTertiary(b.tertiaryColor);
    setFontUi(b.fontUi);
    setFontDisplay(b.fontDisplay);
    setAppName(b.appName);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveColorsFonts(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/admin/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        primaryColor: primary,
        secondaryColor: secondary,
        tertiaryColor: tertiary,
        fontUi,
        fontDisplay,
        appName,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Save failed.");
      return;
    }
    setBranding(data.branding);
    setMessage("Branding saved. Applied across the app.");
    await refreshGlobal();
  }

  async function upload(kind: "logo" | "authBackground", file: File) {
    if (!canWrite) return;
    setSaving(true);
    setError("");
    setMessage("");
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    const res = await fetch("/api/admin/branding", { method: "POST", body: form });
    const data = await res.json();
    setSaving(false);
    if (kind === "logo") setLogoFiles([]);
    else setBgFiles([]);
    if (!res.ok) {
      setError(data.error || "Upload failed.");
      return;
    }
    setBranding(data.branding);
    setMessage(
      kind === "logo"
        ? "Logo updated across the app."
        : "Login background updated."
    );
    await refreshGlobal();
  }

  async function clear(kind: "logo" | "authBackground") {
    if (!canWrite) return;
    if (!confirm(kind === "logo" ? "Remove custom logo?" : "Reset login background?"))
      return;
    setSaving(true);
    const res = await fetch("/api/admin/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        kind === "logo" ? { clearLogo: true } : { clearAuthBackground: true }
      ),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Reset failed.");
      return;
    }
    setBranding(data.branding);
    setMessage("Reset complete.");
    await refreshGlobal();
  }

  if (loading || !branding) return <FormSkeleton />;

  const fontOptions = BRAND_FONT_OPTIONS.map((f) => ({ value: f, label: f }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-display font-semibold">Brand & theme</h2>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Logo, login background, primary / secondary / tertiary colours, and
          fonts apply across the public site, auth pages, portal, and admin.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="app-card p-4 sm:p-6 space-y-4">
          <h3 className="font-semibold">App logo</h3>
          <p className="text-xs text-muted">
            Used in nav, portal, admin, and auth. PNG or SVG recommended, square
            works best.
          </p>
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt="Current logo"
              className="h-16 w-16 object-contain rounded border border-border bg-surface p-1"
            />
          ) : (
            <p className="text-sm text-muted">Using built-in House In Hand mark.</p>
          )}
          {canWrite ? (
            <>
              <ImageFilePicker
                label="Upload logo"
                multiple={false}
                value={logoFiles}
                onChange={(files) => {
                  setLogoFiles(files);
                  if (files[0]) void upload("logo", files[0]);
                }}
                helpText="Select an image, confirm, then it uploads automatically."
              />
              {branding.logoUrl ? (
                <button
                  type="button"
                  className="app-btn app-btn-secondary text-xs"
                  disabled={saving}
                  onClick={() => void clear("logo")}
                >
                  Remove logo
                </button>
              ) : null}
            </>
          ) : null}
        </section>

        <section className="app-card p-4 sm:p-6 space-y-4">
          <h3 className="font-semibold">Login / auth background</h3>
          <p className="text-xs text-muted">
            Full-bleed image behind sign-in, register, and password pages.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={branding.authBackgroundUrl}
            alt="Auth background"
            className="h-32 w-full object-cover rounded border border-border"
          />
          {canWrite ? (
            <>
              <ImageFilePicker
                label="Upload background"
                multiple={false}
                value={bgFiles}
                onChange={(files) => {
                  setBgFiles(files);
                  if (files[0]) void upload("authBackground", files[0]);
                }}
              />
              <button
                type="button"
                className="app-btn app-btn-secondary text-xs"
                disabled={saving}
                onClick={() => void clear("authBackground")}
              >
                Reset to default
              </button>
            </>
          ) : null}
        </section>
      </div>

      <form
        onSubmit={saveColorsFonts}
        className="app-card p-4 sm:p-6 space-y-5 max-w-2xl"
      >
        <h3 className="font-semibold">Colours & typography</h3>

        <div>
          <label className="block text-sm font-medium mb-1.5">App name</label>
          <input
            className="app-input"
            value={appName}
            disabled={!canWrite}
            onChange={(e) => setAppName(e.target.value)}
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <ColorField
            label="Primary (navy / trust)"
            value={primary}
            disabled={!canWrite}
            onChange={setPrimary}
          />
          <ColorField
            label="Secondary (teal / proptech)"
            value={secondary}
            disabled={!canWrite}
            onChange={setSecondary}
          />
          <ColorField
            label="Tertiary (sand / home)"
            value={tertiary}
            disabled={!canWrite}
            onChange={setTertiary}
          />
        </div>

        <div
          className="rounded border border-border overflow-hidden"
          style={{
            background: tertiary,
            color: primary,
          }}
        >
          <div className="px-4 py-3 text-sm" style={{ background: primary, color: tertiary }}>
            Preview chrome
          </div>
          <div className="p-4 space-y-2">
            <p className="font-display text-lg font-semibold" style={{ fontFamily: fontDisplay }}>
              {appName}
            </p>
            <p className="text-sm" style={{ fontFamily: fontUi }}>
              Body text using your UI font.
            </p>
            <span
              className="inline-flex px-3 py-1.5 text-sm font-semibold text-white"
              style={{ background: secondary }}
            >
              Secondary CTA
            </span>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">UI font</label>
            <Select
              value={fontUi}
              onChange={(v) => setFontUi(v as typeof fontUi)}
              options={fontOptions}
              disabled={!canWrite}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Display font</label>
            <Select
              value={fontDisplay}
              onChange={(v) => setFontDisplay(v as typeof fontDisplay)}
              options={fontOptions}
              disabled={!canWrite}
            />
          </div>
        </div>

        {canWrite ? (
          <button
            type="submit"
            disabled={saving}
            className="app-btn app-btn-primary text-sm"
          >
            {saving ? "Saving…" : "Save colours & fonts"}
          </button>
        ) : (
          <p className="text-xs text-muted">You need content:write to edit branding.</p>
        )}
      </form>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-10 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
        <input
          className="app-input font-mono text-xs"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
    </div>
  );
}
