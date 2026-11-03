"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
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
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [proofFiles, setProofFiles] = useState<Record<string, Evidence[]>>({});

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

  async function uploadFile(file: File): Promise<Evidence | null> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/portal/building-issues/upload", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Upload failed.");
      return null;
    }
    return {
      url: data.url,
      publicId: data.publicId,
      kind: "photo",
    };
  }

  async function onCreateProof(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    const next = [...evidence];
    for (const file of Array.from(files).slice(0, 4)) {
      const uploaded = await uploadFile(file);
      if (uploaded) next.push(uploaded);
    }
    setEvidence(next);
    setUploading(false);
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
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
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not submit issue.");
      return;
    }
    setTitle("");
    setDescription("");
    setLocationNote("");
    setEvidence([]);
    setMessage(
      data.issue?.status === "needs_more_proof"
        ? "AI Property Manager needs clearer proof — add photos and re-submit proof on the case."
        : data.issue?.status === "escalated"
          ? "AI Property Manager validated the issue and escalated it to your landlord with recommended actions."
          : "Issue submitted to AI Property Manager."
    );
    await load();
  }

  async function patch(
    id: string,
    payload: Record<string, unknown>
  ) {
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

  async function addProofToCase(id: string, files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    const uploaded: Evidence[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      const item = await uploadFile(file);
      if (item) uploaded.push(item);
    }
    setUploading(false);
    if (!uploaded.length) return;
    setProofFiles({ ...proofFiles, [id]: uploaded });
    await patch(id, { action: "add_proof", evidence: uploaded });
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
          className="app-card p-4 sm:p-5 space-y-4 max-w-xl"
        >
          <h2 className="font-semibold">Report a building issue</h2>
          <p className="text-xs text-muted">
            House In Hands AI Property Manager reviews your report and proof,
            then escalates to the landlord with clear next steps until the case
            is closed.
          </p>
          {propertyOptions.length === 0 ? (
            <p className="text-sm text-muted">
              You need a linked lease to report issues.{" "}
              <Link href="/portal/home" className="text-brand hover:underline">
                My Home
              </Link>
            </p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Property
                </label>
                <Select
                  value={listingId}
                  onChange={setListingId}
                  options={propertyOptions}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Category
                </label>
                <Select
                  value={category}
                  onChange={setCategory}
                  options={CATEGORIES}
                />
              </div>
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
                  className="app-input w-full min-h-[90px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  minLength={10}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Proof photos
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => void onCreateProof(e.target.files)}
                  className="block w-full text-sm"
                />
                {uploading ? (
                  <p className="text-xs text-muted mt-1">Uploading…</p>
                ) : null}
                {evidence.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {evidence.map((e) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={e.url}
                        src={e.url}
                        alt=""
                        className="h-16 w-16 object-cover rounded border border-border"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted mt-1">
                    Photos help the AI Property Manager validate and escalate
                    faster.
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={saving || uploading}
                className="app-btn app-btn-primary text-sm"
              >
                {saving ? "Submitting…" : "Submit to AI Property Manager"}
              </button>
            </>
          )}
        </form>
      ) : null}

      <div>
        <h2 className="font-semibold mb-3">
          {isLandlordLike ? "Building issues on your properties" : "Your cases"}
        </h2>
        {rows.length === 0 ? (
          <EmptyState
            title="No building issues yet"
            description="Tenant reports are validated by the AI Property Manager, then escalated to the landlord with recommended actions until closed."
          />
        ) : (
          <ul className="space-y-4">
            {rows.map((issue) => (
              <li key={issue.id} className="app-card p-4 sm:p-5 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {issue.listingTitle || "Property"} · {issue.title}
                    </p>
                    <p className="text-xs text-muted mt-1 capitalize">
                      {issue.category.replace(/_/g, " ")} ·{" "}
                      {issue.status.replace(/_/g, " ")} · {issue.priority}
                      {issue.aiRecommendation
                        ? ` · AI: ${issue.aiRecommendation.replace(/_/g, " ")}`
                        : ""}
                    </p>
                  </div>
                  <p className="text-xs text-muted">
                    {new Date(issue.createdAt).toLocaleString()}
                  </p>
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
                      // eslint-disable-next-line @next/next/no-img-element
                      <a
                        key={e.url}
                        href={e.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img
                          src={e.url}
                          alt=""
                          className="h-16 w-16 object-cover rounded border border-border"
                        />
                      </a>
                    ))}
                  </div>
                ) : null}

                {issue.aiSummary ? (
                  <div className="rounded-lg border border-border/70 bg-surface/50 p-3 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal">
                      AI Property Manager
                    </p>
                    <p className="text-sm">{issue.aiSummary}</p>
                    {issue.aiReasons?.length ? (
                      <ul className="text-xs text-muted list-disc pl-4">
                        {issue.aiReasons.map((r, i) => (
                          <li key={`${issue.id}-r-${i}`}>{r}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                {issue.recommendedLandlordActions?.length ? (
                  <div>
                    <p className="text-sm font-medium">
                      What the landlord should do
                    </p>
                    <ol className="mt-1 text-sm text-muted list-decimal pl-5 space-y-0.5">
                      {issue.recommendedLandlordActions.map((a, i) => (
                        <li key={`${issue.id}-a-${i}`}>{a}</li>
                      ))}
                    </ol>
                  </div>
                ) : null}

                {issue.landlordActionTaken ? (
                  <p className="text-sm">
                    <span className="font-medium">Action taken: </span>
                    {issue.landlordActionTaken}
                  </p>
                ) : null}

                {issue.timeline?.length ? (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted">
                      Case timeline ({issue.timeline.length})
                    </summary>
                    <ul className="mt-2 space-y-1">
                      {[...issue.timeline]
                        .slice()
                        .reverse()
                        .map((t, i) => (
                          <li key={`${issue.id}-t-${i}`}>
                            <span className="font-medium">
                              {t.actor.replace(/_/g, " ")}
                            </span>
                            : {t.message}
                            <span className="text-muted">
                              {" "}
                              · {new Date(t.at).toLocaleString()}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </details>
                ) : null}

                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {issue.viewerRole === "tenant" &&
                  issue.status === "needs_more_proof" ? (
                    <label className="app-btn app-btn-secondary text-xs cursor-pointer">
                      {uploading ? "Uploading…" : "Add proof photos"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(e) =>
                          void addProofToCase(issue.id, e.target.files)
                        }
                      />
                    </label>
                  ) : null}

                  {issue.viewerRole === "landlord" &&
                  ["escalated", "landlord_in_progress", "ai_validated"].includes(
                    issue.status
                  ) ? (
                    <>
                      <textarea
                        className="app-input w-full text-sm min-h-[60px]"
                        placeholder="Action taken / notes for the tenant"
                        value={actionNotes[issue.id] || ""}
                        onChange={(e) =>
                          setActionNotes({
                            ...actionNotes,
                            [issue.id]: e.target.value,
                          })
                        }
                      />
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
                        Acknowledge / update progress
                      </button>
                      <button
                        type="button"
                        disabled={busyId === issue.id}
                        onClick={() =>
                          void patch(issue.id, {
                            action: "close",
                            actionTaken:
                              actionNotes[issue.id] || "Resolved by landlord",
                          })
                        }
                        className="app-btn app-btn-primary text-xs"
                      >
                        Mark resolved & close
                      </button>
                    </>
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
