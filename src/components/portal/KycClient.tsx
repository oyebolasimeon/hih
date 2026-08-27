"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Reveal } from "@/components/motion/Motion";
import ImageFilePicker from "@/components/ui/ImageFilePicker";
import Select from "@/components/ui/Select";
import { FormSkeleton, StatCardsSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { requirementsForProfile } from "@/lib/kyc-requirements";
import type { ProfileType } from "@/models/Profile";

type ProfileRow = {
  id: string;
  type: ProfileType;
  status: string;
  displayName: string;
};

type KycSubmission = {
  id: string;
  profileId: string;
  profileType: ProfileType;
  status: string;
  requiresManualReview: boolean;
  ninMasked?: string;
  checks: { type: string; status: string; message?: string; confidence?: number }[];
  failureReason?: string;
  createdAt: string;
};

const TYPE_LABEL: Record<ProfileType, string> = {
  student: "Student",
  tenant: "Tenant",
  landlord: "Landlord",
  estate_manager: "Estate Manager",
};

const PROFILE_ACCENT: Record<ProfileType, string> = {
  student: "border-teal/40 bg-teal/5",
  tenant: "border-brand/40 bg-brand/5",
  landlord: "border-navy/30 bg-navy/5 dark:bg-white/5",
  estate_manager: "border-border bg-surface/60",
};

const CHECK_LABELS: Record<string, string> = {
  nin_face: "NIN + face match",
  bvn_face: "BVN + face match",
  cac: "CAC verification",
  student_id: "Student ID",
  manual: "Admin review",
};

function profileStatusLabel(status: string) {
  if (status === "verified") return "Verified";
  if (status === "pending_kyc") return "Pending review";
  if (status === "rejected") return "Rejected";
  if (status === "draft") return "Not started";
  if (status === "suspended") return "Suspended";
  return status.replace(/_/g, " ");
}

function profileStatusClass(status: string) {
  if (status === "verified") return "bg-teal/15 text-brand-dark border-teal/30";
  if (status === "pending_kyc") return "bg-brand/10 text-brand-dark border-brand/25";
  if (status === "rejected") return "bg-danger/10 text-danger border-danger/30";
  return "bg-surface text-muted border-border";
}

function submissionStatusClass(status: string) {
  if (status === "approved") return "bg-teal/15 text-brand-dark border-teal/30";
  if (status === "pending") return "bg-brand/10 text-brand-dark border-brand/25";
  if (status === "failed") return "bg-danger/10 text-danger border-danger/30";
  return "bg-surface text-muted border-border";
}

function checkStatusClass(status: string) {
  if (status === "passed") return "text-brand-dark";
  if (status === "failed") return "text-danger";
  if (status === "pending") return "text-brand";
  return "text-muted";
}

function formatCheckLine(check: KycSubmission["checks"][number]) {
  const label = CHECK_LABELS[check.type] || check.type.replace(/_/g, " ");
  const status =
    check.status === "passed"
      ? "Passed"
      : check.status === "failed"
        ? "Failed"
        : check.status === "pending"
          ? "Pending"
          : check.status;
  const confidence =
    check.confidence != null
      ? ` · ${(check.confidence * 100).toFixed(0)}% match`
      : "";
  const message = check.message ? ` — ${check.message}` : "";
  return `${label}: ${status}${confidence}${message}`;
}

function ShieldIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className}>
      <path d="M12 3l8 4v6c0 5-3.5 7.5-8 8-4.5-.5-8-3-8-8V7l8-4z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function KycClient() {
  const searchParams = useSearchParams();
  const presetProfileId = searchParams.get("profileId") || "";

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(presetProfileId);
  const [showAllSubmissions, setShowAllSubmissions] = useState(false);
  const [nin, setNin] = useState("");
  const [rcNumber, setRcNumber] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyType, setCompanyType] = useState<"RC" | "BN" | "IT">("RC");
  const [institution, setInstitution] = useState("");
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [selfieFiles, setSelfieFiles] = useState<File[]>([]);
  const [studentIdFiles, setStudentIdFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => profiles.find((p) => p.id === profileId) || null,
    [profiles, profileId]
  );

  const requirements = useMemo(
    () => (selected ? requirementsForProfile(selected.type) : []),
    [selected]
  );

  const stats = useMemo(() => {
    const verified = profiles.filter((p) => p.status === "verified").length;
    const pending = profiles.filter((p) => p.status === "pending_kyc").length;
    const needsAction = profiles.filter(
      (p) => !["verified", "pending_kyc"].includes(p.status)
    ).length;
    return { verified, pending, needsAction, total: profiles.length };
  }, [profiles]);

  const visibleSubmissions = useMemo(() => {
    if (showAllSubmissions || !profileId) return submissions;
    return submissions.filter((s) => s.profileId === profileId);
  }, [submissions, profileId, showAllSubmissions]);

  const latestForProfile = useMemo(
    () => submissions.find((s) => s.profileId === profileId) || null,
    [submissions, profileId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [pRes, kRes] = await Promise.all([
      fetch("/api/portal/profiles"),
      fetch("/api/portal/kyc"),
    ]);
    const pData = await pRes.json();
    const kData = await kRes.json();
    setLoading(false);
    if (!pRes.ok) {
      setError(pData.error || "Unable to load profiles.");
      return;
    }
    setProfiles(pData.profiles || []);
    setSubmissions(kData.submissions || []);
    if (!profileId && pData.profiles?.[0]?.id) {
      setProfileId(pData.profiles[0].id);
    }
  }, [profileId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadFile(file: File, kind: string) {
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    const res = await fetch("/api/portal/kyc/upload", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data as { url: string; publicId: string; filename: string };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selected) {
      setError("Select a profile first.");
      return;
    }
    if (!selfieFiles[0]) {
      setError("A clear selfie is required for face match.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const selfie = await uploadFile(selfieFiles[0], "selfie");
      const payload: Record<string, unknown> = {
        profileId: selected.id,
        nin: nin.replace(/\D/g, ""),
        selfieUrl: selfie.url,
        selfiePublicId: selfie.publicId,
      };

      if (selected.type === "estate_manager") {
        payload.cac = {
          rcNumber: rcNumber.trim(),
          companyType,
          companyName: companyName.trim() || undefined,
        };
      }
      if (selected.type === "student") {
        if (!studentIdFiles[0]) {
          throw new Error("Upload your student ID for manual review.");
        }
        const sid = await uploadFile(studentIdFiles[0], "student_id");
        payload.student = {
          institution: institution.trim(),
          studentIdNumber: studentIdNumber.trim(),
          studentIdUrl: sid.url,
          studentIdFilename: sid.filename,
          studentIdPublicId: sid.publicId,
        };
      }

      const res = await fetch("/api/portal/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "KYC submission failed");

      const sub = data.submission;
      if (sub.status === "approved") {
        setMessage("Identity verified. Your profile is now verified.");
      } else if (sub.status === "pending") {
        setMessage(
          "Identity checks passed. Your submission is awaiting Ops review (e.g. student ID)."
        );
      } else {
        setMessage(
          sub.failureReason ||
            "Verification failed. You can fix details and try again."
        );
      }
      setNin("");
      setSelfieFiles([]);
      setStudentIdFiles([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "KYC failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">
            Identity verification
          </h1>
          <p className="mt-1 text-sm text-muted max-w-2xl">
            Verify your identity with NIN and a selfie. Estate managers also
            submit CAC details; student IDs are reviewed by Ops.
          </p>
        </div>
        <StatCardsSkeleton count={3} />
        <FormSkeleton />
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">
            Identity verification
          </h1>
          <p className="mt-1 text-sm text-muted max-w-2xl">
            Create a profile first, then complete KYC to unlock listings,
            applications, and payments.
          </p>
        </div>
        <EmptyState
          title="Create a profile first"
          description="KYC is per profile. Add a Tenant, Student, Landlord, or Estate Manager profile, then return here."
        >
          <Link href="/portal/profiles" className="app-btn app-btn-primary text-sm">
            Go to Profiles
          </Link>
        </EmptyState>
      </div>
    );
  }

  const isVerified = selected?.status === "verified";
  const isPendingReview = selected?.status === "pending_kyc";
  const canSubmit = !submitting && !isVerified && !isPendingReview;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Identity verification
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Verify your identity with NIN and a selfie. Estate managers also
          submit CAC details; student IDs are reviewed by Ops.
        </p>
      </div>

      <section className="grid sm:grid-cols-3 gap-3">
        <Reveal>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Verified profiles
            </p>
            <p className="mt-2 text-2xl font-display font-semibold">
              {stats.verified}
              <span className="text-base font-normal text-muted">
                {" "}
                / {stats.total}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted">Ready for platform features</p>
          </div>
        </Reveal>
        <Reveal delay={0.04}>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Pending review
            </p>
            <p className="mt-2 text-2xl font-display font-semibold">
              {stats.pending}
            </p>
            <p className="mt-1 text-xs text-muted">Awaiting automated or Ops review</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Needs verification
            </p>
            <p className="mt-2 text-2xl font-display font-semibold">
              {stats.needsAction}
            </p>
            <p className="mt-1 text-xs text-muted">Not yet submitted or rejected</p>
          </div>
        </Reveal>
      </section>

      <Reveal>
        <section className="space-y-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Choose profile</h2>
            <p className="text-sm text-muted">
              Each profile type has its own verification requirements.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => {
              const active = p.id === profileId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProfileId(p.id)}
                  className={`rounded-xl border px-4 py-3 text-left transition-colors min-w-[180px] ${
                    active
                      ? `${PROFILE_ACCENT[p.type]} border-brand ring-1 ring-brand/30`
                      : "border-border hover:border-brand/30 hover:bg-surface/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{p.displayName}</p>
                      <p className="text-xs text-muted mt-0.5">
                        {TYPE_LABEL[p.type]}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${profileStatusClass(p.status)}`}
                    >
                      {profileStatusLabel(p.status)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </Reveal>

      {error ? (
        <p
          className="text-sm text-danger rounded-md border border-danger/20 bg-danger/5 px-3 py-2"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-brand-dark rounded-md border border-brand/20 bg-brand/5 px-3 py-2">
          {message}
        </p>
      ) : null}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {isVerified ? (
            <Reveal>
              <div className="app-card overflow-hidden">
                <div className="px-5 py-8 sm:px-8 border-b border-border/60 bg-gradient-to-br from-teal/15 to-transparent text-center sm:text-left">
                  <div className="inline-flex items-center justify-center rounded-full bg-teal/20 p-3 text-brand-dark mb-4">
                    <ShieldIcon className="h-7 w-7" />
                  </div>
                  <h2 className="font-display text-xl font-semibold">
                    {selected?.displayName} is verified
                  </h2>
                  <p className="text-sm text-muted mt-2 max-w-lg">
                    Your {TYPE_LABEL[selected!.type].toLowerCase()} profile passed
                    identity checks. You can list properties, apply for homes, and
                    use payments without additional verification.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 justify-center sm:justify-start">
                    {selected?.type === "landlord" || selected?.type === "estate_manager" ? (
                      <Link href="/portal/listings" className="app-btn app-btn-primary text-sm">
                        Manage listings
                      </Link>
                    ) : (
                      <Link href="/portal/search" className="app-btn app-btn-primary text-sm">
                        Search homes
                      </Link>
                    )}
                    <Link href="/portal" className="app-btn app-btn-secondary text-sm">
                      Back to dashboard
                    </Link>
                  </div>
                </div>
                {latestForProfile?.ninMasked ? (
                  <div className="px-5 py-4 sm:px-8 text-sm text-muted">
                    NIN on file:{" "}
                    <span className="text-foreground font-medium">
                      {latestForProfile.ninMasked}
                    </span>
                  </div>
                ) : null}
              </div>
            </Reveal>
          ) : isPendingReview ? (
            <Reveal>
              <div className="app-card overflow-hidden">
                <div className="px-5 py-8 sm:px-8 bg-gradient-to-br from-brand/10 to-transparent">
                  <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                    Under review
                  </p>
                  <h2 className="font-display text-xl font-semibold mt-2">
                    We&apos;re reviewing {selected?.displayName}
                  </h2>
                  <p className="text-sm text-muted mt-2 max-w-lg">
                    Automated identity checks are complete. Our Ops team may still need to
                    review documents (e.g. student ID). You&apos;ll be notified
                    when this profile is approved.
                  </p>
                  {latestForProfile?.requiresManualReview ? (
                    <p className="mt-3 text-xs text-brand-dark rounded-md border border-brand/20 bg-brand/5 px-3 py-2 inline-block">
                      Waiting for manual Ops / KYC review
                    </p>
                  ) : null}
                </div>
              </div>
            </Reveal>
          ) : (
            <Reveal>
              <form onSubmit={onSubmit} className="app-card overflow-hidden">
                <div className="px-5 py-6 sm:px-6 border-b border-border/60 bg-gradient-to-br from-brand/10 to-transparent">
                  <h2 className="font-display text-lg font-semibold">
                    Verify {selected?.displayName}
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    Secure NIN and face match verification
                  </p>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                  {selected?.status === "rejected" && latestForProfile?.failureReason ? (
                    <p className="text-sm text-danger rounded-md border border-danger/20 bg-danger/5 px-3 py-2">
                      Previous attempt failed: {latestForProfile.failureReason}
                    </p>
                  ) : null}

                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      NIN (11 digits)
                    </label>
                    <input
                      className="app-input w-full"
                      inputMode="numeric"
                      maxLength={11}
                      value={nin}
                      onChange={(e) =>
                        setNin(e.target.value.replace(/\D/g, "").slice(0, 11))
                      }
                      placeholder="e.g. 12345678901"
                      required
                    />
                    <p className="mt-1 text-xs text-muted">{nin.length}/11 digits</p>
                  </div>

                  {selected?.type === "estate_manager" ? (
                    <div className="space-y-3 rounded-lg border border-border/60 p-4 bg-surface/40">
                      <p className="text-sm font-medium">Company details</p>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">
                          RC / CAC number
                        </label>
                        <input
                          className="app-input w-full"
                          value={rcNumber}
                          onChange={(e) => setRcNumber(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">
                          Company type
                        </label>
                        <Select
                          value={companyType}
                          onChange={(v) => setCompanyType(v as "RC" | "BN" | "IT")}
                          options={[
                            { value: "RC", label: "RC — Limited company" },
                            { value: "BN", label: "BN — Business name" },
                            { value: "IT", label: "IT — Incorporated trustees" },
                          ]}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">
                          Company name (optional)
                        </label>
                        <input
                          className="app-input w-full"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}

                  {selected?.type === "student" ? (
                    <div className="space-y-3 rounded-lg border border-border/60 p-4 bg-surface/40">
                      <p className="text-sm font-medium">Student details</p>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">
                          Institution
                        </label>
                        <input
                          className="app-input w-full"
                          value={institution}
                          onChange={(e) => setInstitution(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">
                          Student ID number
                        </label>
                        <input
                          className="app-input w-full"
                          value={studentIdNumber}
                          onChange={(e) => setStudentIdNumber(e.target.value)}
                          required
                        />
                      </div>
                      <ImageFilePicker
                        label="Student ID photo"
                        multiple={false}
                        value={studentIdFiles}
                        onChange={setStudentIdFiles}
                        helpText="Clear photo or scan of your student ID card."
                      />
                    </div>
                  ) : null}

                  <ImageFilePicker
                    label="Selfie for face match"
                    multiple={false}
                    value={selfieFiles}
                    onChange={setSelfieFiles}
                    helpText="Face forward, good lighting. Used for NIN face match."
                  />

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="app-btn app-btn-primary text-sm w-full sm:w-auto"
                  >
                    {submitting ? "Verifying identity…" : "Submit verification"}
                  </button>
                </div>
              </form>
            </Reveal>
          )}
        </div>

        <Reveal delay={0.06}>
          <aside className="app-card p-5 sm:p-6 space-y-4 h-fit">
            <div>
              <h3 className="font-display font-semibold">Requirements</h3>
              <p className="text-xs text-muted mt-1">
                For {selected ? TYPE_LABEL[selected.type] : "this profile"}
              </p>
            </div>
            <ol className="space-y-3">
              {requirements.map((req, i) => (
                <li key={req.type} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold text-muted">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{req.label}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {req.provider === "prembly"
                        ? "Automated verification"
                        : "Reviewed by Ops team"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="rounded-lg border border-border/60 bg-surface/40 p-3 text-xs text-muted space-y-1">
              <p className="font-medium text-foreground">Tips</p>
              <p>Use the same person in your selfie as on your NIN record.</p>
              <p>Photos should be well lit with no filters or sunglasses.</p>
            </div>
          </aside>
        </Reveal>
      </div>

      <section className="space-y-4">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Submission history</h2>
              <p className="text-sm text-muted">
                {showAllSubmissions
                  ? "All profiles"
                  : selected
                    ? `Showing ${selected.displayName}`
                    : "Recent attempts"}
              </p>
            </div>
            {submissions.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowAllSubmissions((v) => !v)}
                className="app-btn app-btn-secondary text-xs"
              >
                {showAllSubmissions ? "Filter to selected" : "Show all profiles"}
              </button>
            ) : null}
          </div>
        </Reveal>

        {visibleSubmissions.length === 0 ? (
          <p className="text-sm text-muted">No KYC submissions yet for this profile.</p>
        ) : (
          <ul className="space-y-3">
            {visibleSubmissions.map((s) => (
              <Reveal key={s.id}>
                <li className="app-card p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{TYPE_LABEL[s.profileType]}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${submissionStatusClass(s.status)}`}
                        >
                          {s.status}
                        </span>
                      </div>
                      {s.ninMasked ? (
                        <p className="text-xs text-muted">NIN {s.ninMasked}</p>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted shrink-0">
                      {new Date(s.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {s.checks?.length ? (
                    <ul className="space-y-1.5 border-t border-border/60 pt-3">
                      {s.checks.map((c, i) => (
                        <li
                          key={`${c.type}-${i}`}
                          className={`text-xs ${checkStatusClass(c.status)}`}
                        >
                          {formatCheckLine(c)}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {s.failureReason ? (
                    <p className="text-xs text-danger">{s.failureReason}</p>
                  ) : null}
                  {s.requiresManualReview && s.status === "pending" ? (
                    <p className="text-xs text-brand-dark">
                      Waiting for Ops / KYC manual review
                    </p>
                  ) : null}
                </li>
              </Reveal>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
