"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useActiveProfile } from "@/hooks/useActiveProfile";

type PropertyOption = {
  listingId: string;
  title: string;
  city?: string;
};

type ComplaintRow = {
  id: string;
  listingId: string;
  category: string;
  title: string;
  details: string;
  status: string;
  landlordNotes: string;
  listingTitle: string | null;
  createdAt: string;
};

const CATEGORY_OPTIONS = [
  { value: "noise", label: "Noise" },
  { value: "billing", label: "Billing" },
  { value: "maintenance", label: "Maintenance" },
  { value: "safety", label: "Safety" },
  { value: "neighbor", label: "Neighbor" },
  { value: "lease", label: "Lease terms" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
];

export default function ComplaintsClient() {
  const { isLandlordLike, isTenantLike, loading: profileLoading } =
    useActiveProfile();
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [rows, setRows] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const [listingId, setListingId] = useState("");
  const [category, setCategory] = useState("other");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [cRes, pRes] = await Promise.all([
      fetch("/api/portal/complaints"),
      fetch("/api/portal/properties"),
    ]);
    const cData = await cRes.json();
    const pData = await pRes.json();
    setLoading(false);
    if (!cRes.ok) {
      setError(cData.error || "Unable to load complaints.");
      return;
    }
    setRows(cData.complaints || []);
    const props = ((pData.properties || []) as PropertyOption[]).filter(
      (p) => true
    );
    setProperties(props);
    if (!listingId && props[0]) setListingId(props[0].listingId);
  }, [listingId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, category, title, details }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not submit complaint.");
      return;
    }
    setTitle("");
    setDetails("");
    setMessage("Complaint submitted to your landlord.");
    await load();
  }

  async function updateComplaint(id: string, status: string) {
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/portal/complaints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        landlordNotes: notes[id] || undefined,
      }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Could not update complaint.");
      return;
    }
    setMessage("Complaint updated.");
    await load();
  }

  if (loading || profileLoading) return <TableSkeleton rows={4} />;

  const propertyOptions = properties.map((p) => ({
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
        <form onSubmit={onCreate} className="app-card p-4 sm:p-5 space-y-4 max-w-xl">
          <h2 className="font-semibold">Report a complaint</h2>
          <p className="text-xs text-muted">
            For issues on a home you currently lease. Your landlord is notified.
          </p>
          {propertyOptions.length === 0 ? (
            <p className="text-sm text-muted">
              You need an active lease before filing a complaint.
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
                  options={CATEGORY_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Title</label>
                <input
                  className="app-input w-full"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Details
                </label>
                <textarea
                  className="app-input w-full min-h-[90px]"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  required
                  minLength={5}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="app-btn app-btn-primary text-sm"
              >
                {saving ? "Submitting…" : "Submit complaint"}
              </button>
            </>
          )}
        </form>
      ) : null}

      {isLandlordLike ? (
        <p className="text-sm text-muted">
          Complaints from tenants on your leased properties. Update status and
          leave notes.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No complaints"
          description={
            isLandlordLike
              ? "When tenants raise complaints on leased homes, they appear here."
              : "Submit a complaint about a leased property above."
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id} className="app-card p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {c.title} · {c.status}
                  </p>
                  <p className="text-xs text-muted mt-1 capitalize">
                    {c.listingTitle || "Property"} ·{" "}
                    {c.category.replace("_", " ")} ·{" "}
                    {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted whitespace-pre-wrap">{c.details}</p>
              {c.landlordNotes ? (
                <p className="text-xs text-muted">
                  Landlord notes: {c.landlordNotes}
                </p>
              ) : null}
              {isLandlordLike ? (
                <div className="space-y-2 border-t border-border pt-3">
                  <input
                    className="app-input w-full text-sm"
                    placeholder="Notes to tenant (optional)"
                    value={notes[c.id] ?? c.landlordNotes}
                    onChange={(e) =>
                      setNotes({ ...notes, [c.id]: e.target.value })
                    }
                  />
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      className="app-input text-xs w-auto"
                      value={c.status}
                      disabled={busyId === c.id}
                      onChange={(e) => void updateComplaint(c.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busyId === c.id}
                      className="app-btn app-btn-secondary text-xs"
                      onClick={() => void updateComplaint(c.id, c.status)}
                    >
                      Save notes
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
