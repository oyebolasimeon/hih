"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import ImageFilePicker from "@/components/ui/ImageFilePicker";
import Select from "@/components/ui/Select";
import { FormSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

type ProfileType = "student" | "tenant" | "landlord" | "estate_manager";

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

export default function KycClient() {
  const searchParams = useSearchParams();
  const presetProfileId = searchParams.get("profileId") || "";

  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState(presetProfileId);
  const [nin, setNin] = useState("");
  const [bvn, setBvn] = useState("");
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
      setError("A clear selfie is required for Prembly face match.");
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

      if (selected.type === "landlord") {
        payload.bvn = bvn.replace(/\D/g, "");
      }
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
        setMessage("Identity verified with Prembly. Your profile is now verified.");
      } else if (sub.status === "pending") {
        setMessage(
          "Prembly checks passed. Your submission is awaiting Ops review (e.g. student ID)."
        );
      } else {
        setMessage(
          sub.failureReason ||
            "Verification failed. You can fix details and try again."
        );
      }
      setNin("");
      setBvn("");
      setSelfieFiles([]);
      setStudentIdFiles([]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "KYC failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <FormSkeleton />;

  if (profiles.length === 0) {
    return (
      <EmptyState
        title="Create a profile first"
        description="KYC is per profile. Add a Tenant, Student, Landlord, or Estate Manager profile, then return here."
      >
        <Link href="/portal/profiles" className="app-btn app-btn-primary text-sm">
          Go to Profiles
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      <form onSubmit={onSubmit} className="app-card p-4 sm:p-6 space-y-5 max-w-xl">
        <div>
          <label className="block text-sm font-medium mb-1.5">Profile</label>
          <Select
            value={profileId}
            onChange={setProfileId}
            options={profiles.map((p) => ({
              value: p.id,
              label: `${TYPE_LABEL[p.type]} · ${p.displayName} (${p.status})`,
            }))}
          />
        </div>

        {selected ? (
          <p className="text-xs text-muted">
            Required: NIN + selfie via Prembly
            {selected.type === "landlord" ? "; BVN + selfie" : ""}
            {selected.type === "estate_manager" ? "; CAC / RC lookup" : ""}
            {selected.type === "student"
              ? "; student ID upload (manual Ops review)"
              : ""}
            .
          </p>
        ) : null}

        <div>
          <label className="block text-sm font-medium mb-1.5">NIN (11 digits)</label>
          <input
            className="app-input w-full"
            inputMode="numeric"
            maxLength={11}
            value={nin}
            onChange={(e) => setNin(e.target.value.replace(/\D/g, "").slice(0, 11))}
            placeholder="e.g. 12345678901"
            required
          />
        </div>

        {selected?.type === "landlord" ? (
          <div>
            <label className="block text-sm font-medium mb-1.5">BVN (11 digits)</label>
            <input
              className="app-input w-full"
              inputMode="numeric"
              maxLength={11}
              value={bvn}
              onChange={(e) => setBvn(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="Bank Verification Number"
              required
            />
          </div>
        ) : null}

        {selected?.type === "estate_manager" ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">RC / CAC number</label>
              <input
                className="app-input w-full"
                value={rcNumber}
                onChange={(e) => setRcNumber(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Company type</label>
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
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">Institution</label>
              <input
                className="app-input w-full"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Student ID number</label>
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
          helpText="Face forward, good lighting. Used for Prembly NIN (and BVN) face match."
        />

        <button
          type="submit"
          disabled={submitting || selected?.status === "verified"}
          className="app-btn app-btn-primary text-sm"
        >
          {submitting
            ? "Verifying with Prembly…"
            : selected?.status === "verified"
              ? "Already verified"
              : "Submit KYC"}
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Your submissions</h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-muted">No KYC submissions yet.</p>
        ) : (
          <ul className="space-y-2">
            {submissions.map((s) => (
              <li key={s.id} className="app-card p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {TYPE_LABEL[s.profileType]} · {s.status}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(s.createdAt).toLocaleString()}
                  </p>
                </div>
                {s.ninMasked ? (
                  <p className="text-xs text-muted">NIN {s.ninMasked}</p>
                ) : null}
                <ul className="text-xs text-muted space-y-1">
                  {s.checks?.map((c, i) => (
                    <li key={`${c.type}-${i}`}>
                      {c.type}: <span className="text-foreground">{c.status}</span>
                      {c.confidence != null
                        ? ` · confidence ${(c.confidence * 100).toFixed(0)}%`
                        : ""}
                      {c.message ? ` — ${c.message}` : ""}
                    </li>
                  ))}
                </ul>
                {s.failureReason ? (
                  <p className="text-xs text-danger">{s.failureReason}</p>
                ) : null}
                {s.requiresManualReview ? (
                  <p className="text-xs text-brand-dark">
                    Waiting for Ops / KYC manual review
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
