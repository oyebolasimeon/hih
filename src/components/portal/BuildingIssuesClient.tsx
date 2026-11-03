"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import ImageFilePicker from "@/components/ui/ImageFilePicker";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useActiveProfile } from "@/hooks/useActiveProfile";

type PropertyOption = {
  listingId: string;
  title: string;
  city?: string;
  role: "owner" | "tenant";
};

type Evidence = {
  url: string;
  publicId?: string;
  kind?: string;
  caption?: string;
};

type TimelineEvent = {
  at: string;
  actor: string;
  type: string;
  message: string;
};

type IssueRow = {
  id: string;
  listingId: string;
  category: string;
  title: string;
  description: string;
  locationNote: string;
  priority: string;
  status: string;
  evidence: Evidence[];
  aiRecommendation: string | null;
  aiSummary: string;
  aiReasons: string[];
  recommendedLandlordActions: string[];
  proofSufficient: boolean | null;
  landlordNotes: string;
  landlordActionTaken: string;
  timeline: TimelineEvent[];
  listingTitle: string | null;
  listingCity: string | null;
  viewerRole: string;
  createdAt: string;
};

const CATEGORIES = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "structural", label: "Structural" },
  { value: "pest", label: "Pest" },
  { value: "security", label: "Security" },
  { value: "common_area", label: "Common area" },
  { value: "water", label: "Water" },
  { value: "waste", label: "Waste" },
  { value: "noise_facility", label: "Facility noise" },
  { value: "other", label: "Other" },
];

const STATUS_TONE: Record<string, string> = {
  escalated: "bg-brand/15 text-brand-dark border-brand/30",
  landlord_in_progress: "bg-teal/15 text-brand-dark border-teal/30",
  needs_more_proof: "bg-[color-mix(in_srgb,var(--color-danger)_12%,transparent)] text-danger border-danger/25",
  closed: "bg-surface-dark text-muted border-border",
  dismissed: "bg-surface-dark text-muted border-border",
  pending_ai: "bg-surface text-muted border-border",
};

export default function BuildingIssuesClient() {
  const { isLandlordLike, isTenantLike, loading: profileLoading } =
    useActiveProfile();
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [rows, setRows] = useState<IssueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [uploading, setUploading] = useState(false);

  const [listingId, setListingId] = useState("");
  const [category, setCategory] = useState("plumbing");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [extraProof, setExtraProof] = useState<Record<string, File[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [iRes, pRes] = await Promise.all([
      fetch("/api/portal/building-issues"),
      fetch("/api/portal/properties"),
    ]);
    const iData = await iRes.json();
    const pData = await pRes.json();
    setLoading(false);
    if (!iRes.ok) {
      setError(iData.error || "Unable to load building issues.");
      return;
    }
    setRows(iData.issues || []);
    const props = (pData.properties || []) as PropertyOption[];
    setProperties(props);
    if (!listingId && props[0]) setListingId(props[0].listingId);
  }, [listingId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function uploadFiles(files: File[]): Promise<Evidence[]> {
    const uploaded: Evidence[] = [];
    for (const file of files.slice(0, 6)) {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/portal/building-issues/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed.");
      }
      uploaded.push({
        url: data.url,
        publicId: data.publicId,
        kind: "photo",
      });
    }
    return uploaded;
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const evidence = await uploadFiles(proofFiles);
      const res = await fetch("/api/portal/building-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          category,
          title,
          description,
          locationNote: locationNote || undefined,
          evidence,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not submit issue.");
        setSaving(false);
        setUploading(false);
        return;
      }
      setTitle("");
      setDescription("");
      setLocationNote("");
      setProofFiles([]);
      setMessage(
        data.issue?.status === "needs_more_proof"
          ? "AI Property Manager needs clearer proof — add photos on the case below."
          : data.issue?.status === "escalated"
            ? "Validated and escalated to your landlord with recommended actions."
            : "Issue submitted to AI Property Manager."
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit issue.");
    }
    setSaving(false);
    setUploading(false);
  }

  async function patch(id: string, payload: Record<string, unknown>) {
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/portal/building-issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Update failed.");
      return;
    }
    setMessage("Case updated.");
    await load();
  }

  async function submitExtraProof(id: string) {
    const files = extraProof[id] || [];
    if (!files.length) {
      setError("Choose proof photos first.");
      return;
    }
    setUploading(true);
    try {
      const evidence = await uploadFiles(files);
      await patch(id, { action: "add_proof", evidence });
      setExtraProof({ ...extraProof, [id]: [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
    setUploading(false);
  }

  if (loading || profileLoading) return <TableSkeleton rows={4} />;

  const tenantProps = properties.filter((p) => p.role === "tenant");
  const propertyOptions = tenantProps.map((p) => ({
    value: p.listingId,
    label: `${p.title}${p.city ? ` · ${p.city}` : ""}`,
  }));

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      {isTenantLike ? (
        <form
          onSubmit={onCreate}
          className="app-card p-4 sm:p-6 space-y-5 max-w-2xl"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
              AI Property Manager
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold">
              Report a building issue
            </h2>
            <p className="mt-1 text-xs text-muted">
              Attach proof photos. The AI Property Manager validates the case,
              escalates to your landlord with next steps, and tracks until closed.
            </p>
          </div>

          {propertyOptions.length === 0 ? (
            <p className="text-sm text-muted">
              You need a linked lease to report issues.{" "}
              <Link href="/portal/home" className="text-brand hover:underline">
                My Home
              </Link>
            </p>
          ) : (
            <>
              <Select
                label="Property"
                value={listingId}
                onChange={setListingId}
                options={propertyOptions}
                required
              />
              <Select
                label="Category"
                value={category}
                onChange={setCategory}
                options={CATEGORIES}
              />
              <div>
                <label className="block text-sm font-medium mb-1.5">Title</label>
                <input
                  className="app-input w-full"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Leaking pipe in stairwell"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Where in the building?
                </label>
                <input
                  className="app-input w-full"
                  value={locationNote}
                  onChange={(e) => setLocationNote(e.target.value)}
                  placeholder="2nd floor corridor / generator house"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Details
                </label>
                <textarea
                  className="app-input w-full min-h-[100px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={10}
                />
              </div>
              <ImageFilePicker
                label="Proof photos"
                accept="image/jpeg,image/png,image/webp"
                multiple
                value={proofFiles}
                onChange={setProofFiles}
                helpText="Preview and confirm photos before they are sent to the AI Property Manager."
              />
              <button
                type="submit"
                disabled={saving || uploading}
                className="app-btn app-btn-primary text-sm"
              >
                {saving || uploading
                  ? "Submitting…"
                  : "Submit to AI Property Manager"}
              </button>
            </>
          )}
        </form>
      ) : null}

      <div>
        <div className="mb-3">
          <h2 className="font-display text-lg font-semibold">
            {isLandlordLike ? "Issues on your properties" : "Your cases"}
          </h2>
          <p className="text-xs text-muted">
            Validation, escalation and progress until closed
          </p>
        </div>
        {rows.length === 0 ? (
          <EmptyState
            title="No building issues yet"
            description="Tenant reports are validated by the AI Property Manager, then escalated with recommended landlord actions."
          />
        ) : (
          <ul className="space-y-4">
            {rows.map((issue) => (
              <li key={issue.id} className="app-card overflow-hidden">
                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {issue.listingTitle || "Property"}
                      </p>
                      <p className="text-base font-display font-semibold mt-0.5">
                        {issue.title}
                      </p>
                      <p className="text-xs text-muted mt-1 capitalize">
                        {issue.category.replace(/_/g, " ")} · {issue.priority}
                        {issue.listingCity ? ` · ${issue.listingCity}` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                        STATUS_TONE[issue.status] ||
                        "bg-surface text-muted border-border"
                      }`}
                    >
                      {issue.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="text-sm text-muted whitespace-pre-wrap">
                    {issue.description}
                  </p>
                  {issue.locationNote ? (
                    <p className="text-xs text-muted">
                      Location: {issue.locationNote}
                    </p>
                  ) : null}

                  {issue.evidence?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {issue.evidence.map((e) => (
                        <a
                          key={e.url}
                          href={e.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-lg border border-border"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={e.url}
                            alt=""
                            className="h-20 w-20 object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}

                  {issue.aiSummary ? (
                    <div className="rounded-xl border border-teal/25 bg-teal/5 p-3.5 space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-teal">
                        AI Property Manager
                        {issue.aiRecommendation
                          ? ` · ${issue.aiRecommendation.replace(/_/g, " ")}`
                          : ""}
                      </p>
                      <p className="text-sm">{issue.aiSummary}</p>
                      {issue.aiReasons?.length ? (
                        <ul className="text-xs text-muted list-disc pl-4 space-y-0.5">
                          {issue.aiReasons.map((r, i) => (
                            <li key={`${issue.id}-r-${i}`}>{r}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}

                  {issue.recommendedLandlordActions?.length ? (
                    <div className="rounded-xl border border-border bg-surface/50 p-3.5">
                      <p className="text-sm font-medium">
                        What the landlord should do
                      </p>
                      <ol className="mt-2 text-sm text-muted list-decimal pl-5 space-y-1">
                        {issue.recommendedLandlordActions.map((a, i) => (
                          <li key={`${issue.id}-a-${i}`}>{a}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}

                  {issue.landlordActionTaken ? (
                    <p className="text-sm rounded-lg bg-brand-subtle/60 px-3 py-2">
                      <span className="font-medium">Action taken: </span>
                      {issue.landlordActionTaken}
                    </p>
                  ) : null}

                  {issue.timeline?.length ? (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted hover:text-foreground">
                        Case timeline ({issue.timeline.length})
                      </summary>
                      <ul className="mt-2 space-y-2 border-l border-border pl-3">
                        {[...issue.timeline]
                          .slice()
                          .reverse()
                          .map((t, i) => (
                            <li key={`${issue.id}-t-${i}`}>
                              <span className="font-medium capitalize">
                                {t.actor.replace(/_/g, " ")}
                              </span>
                              <span className="text-muted"> — {t.message}</span>
                              <p className="text-[11px] text-muted">
                                {new Date(t.at).toLocaleString()}
                              </p>
                            </li>
                          ))}
                      </ul>
                    </details>
                  ) : null}
                </div>

                <div className="border-t border-border bg-surface/40 px-4 sm:px-5 py-4 space-y-3">
                  {issue.viewerRole === "tenant" &&
                  issue.status === "needs_more_proof" ? (
                    <div className="space-y-3">
                      <ImageFilePicker
                        label="Add clearer proof"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        value={extraProof[issue.id] || []}
                        onChange={(files) =>
                          setExtraProof({ ...extraProof, [issue.id]: files })
                        }
                        helpText="Confirm photos, then send them for another AI review."
                      />
                      <button
                        type="button"
                        disabled={
                          busyId === issue.id ||
                          uploading ||
                          !(extraProof[issue.id] || []).length
                        }
                        onClick={() => void submitExtraProof(issue.id)}
                        className="app-btn app-btn-primary text-xs disabled:opacity-50"
                      >
                        Send proof for re-check
                      </button>
                    </div>
                  ) : null}

                  {issue.viewerRole === "landlord" &&
                  ["escalated", "landlord_in_progress", "ai_validated"].includes(
                    issue.status
                  ) ? (
                    <div className="space-y-3">
                      <label className="block text-sm font-medium">
                        Action taken / notes for tenant
                      </label>
                      <textarea
                        className="app-input w-full text-sm min-h-[72px]"
                        value={actionNotes[issue.id] || ""}
                        onChange={(e) =>
                          setActionNotes({
                            ...actionNotes,
                            [issue.id]: e.target.value,
                          })
                        }
                        placeholder="Inspected today, plumber booked for Friday…"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === issue.id}
                          onClick={() =>
                            void patch(issue.id, {
                              action: "landlord_ack",
                              notes: actionNotes[issue.id],
                              actionTaken: actionNotes[issue.id],
                            })
                          }
                          className="app-btn app-btn-secondary text-xs"
                        >
                          Update progress
                        </button>
                        <button
                          type="button"
                          disabled={busyId === issue.id}
                          onClick={() =>
                            void patch(issue.id, {
                              action: "close",
                              actionTaken:
                                actionNotes[issue.id] ||
                                "Resolved by landlord",
                            })
                          }
                          className="app-btn app-btn-primary text-xs"
                        >
                          Mark resolved & close
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {issue.viewerRole === "tenant" &&
                  ["escalated", "landlord_in_progress"].includes(
                    issue.status
                  ) ? (
                    <button
                      type="button"
                      disabled={busyId === issue.id}
                      onClick={() =>
                        void patch(issue.id, {
                          action: "close",
                          notes: "Confirmed resolved by tenant",
                        })
                      }
                      className="app-btn app-btn-secondary text-xs"
                    >
                      Confirm resolved
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
