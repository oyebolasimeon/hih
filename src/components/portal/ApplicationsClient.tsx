"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useActiveProfile } from "@/hooks/useActiveProfile";
import { useSession } from "next-auth/react";

type ApplicationRow = {
  id: string;
  listingId: string;
  applicantProfileId: string;
  applicantUserId: string;
  landlordProfileId: string;
  message: string;
  status: string;
  landlordNotes: string;
  createdAt: string;
  listing: {
    id: string;
    title: string;
    city?: string;
    state?: string;
    price?: { amount: number; currency: string; period: string };
  } | null;
};

export default function ApplicationsClient() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const { isLandlordLike, isTenantLike, loading: profileLoading } =
    useActiveProfile();
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [listingId, setListingId] = useState(
    () => searchParams.get("listingId") || ""
  );
  const [applyMessage, setApplyMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/applications");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load applications.");
      return;
    }
    setRows(data.applications || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = searchParams.get("listingId");
    if (id) setListingId(id);
  }, [searchParams]);

  async function onApply(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId: listingId.trim(),
        message: applyMessage.trim() || undefined,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Could not submit application.");
      return;
    }
    setListingId("");
    setApplyMessage("");
    setMessage("Application submitted.");
    await load();
  }

  async function review(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    setError("");
    setMessage("");
    const res = await fetch(`/api/portal/applications/${id}`, {
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
      setError(data.error || "Could not update application.");
      return;
    }
    setMessage(
      status === "approved"
        ? "Approved — lease draft created for signatures."
        : "Application rejected."
    );
    await load();
  }

  if (loading || profileLoading) return <TableSkeleton rows={4} />;

  const myUserId = session?.user?.id || "";
  const outgoing = rows.filter((a) => a.applicantUserId === myUserId);
  const incoming = rows.filter((a) => a.applicantUserId !== myUserId);

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      {isTenantLike ? (
        <form onSubmit={onApply} className="app-card p-4 sm:p-5 space-y-4 max-w-xl">
          <h2 className="font-semibold">Apply to a listing</h2>
          <p className="text-xs text-muted">
            Use a verified tenant or student profile. Listing ID comes from
            search or a listing detail page.
          </p>
          <div>
            <label className="block text-sm font-medium mb-1.5">Listing ID</label>
            <input
              className="app-input w-full"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              required
              placeholder="Listing ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Message</label>
            <textarea
              className="app-input w-full min-h-[80px]"
              value={applyMessage}
              onChange={(e) => setApplyMessage(e.target.value)}
              placeholder="Introduce yourself to the landlord"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="app-btn app-btn-primary text-sm"
          >
            {submitting ? "Submitting…" : "Submit application"}
          </button>
        </form>
      ) : null}

      {isLandlordLike ? (
        <>
          <h2 className="font-semibold">Incoming applications</h2>
          {incoming.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="When tenants apply to your listings, they will appear here for review."
            />
          ) : (
            <ul className="space-y-3">
              {incoming.map((a) => (
                <li key={a.id} className="app-card p-4 sm:p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {a.listing?.title || "Listing"} · {a.status}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {[a.listing?.city, a.listing?.state]
                          .filter(Boolean)
                          .join(", ")}
                        {a.listing?.price
                          ? ` · ${a.listing.price.currency} ${a.listing.price.amount.toLocaleString()}/${a.listing.price.period}`
                          : ""}
                      </p>
                    </div>
                    <p className="text-xs text-muted">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {a.message ? (
                    <p className="text-sm text-muted">{a.message}</p>
                  ) : null}
                  {a.landlordNotes ? (
                    <p className="text-xs text-muted">
                      Notes: {a.landlordNotes}
                    </p>
                  ) : null}
                  {["submitted", "under_review"].includes(a.status) ? (
                    <div className="space-y-2 border-t border-border pt-3">
                      <input
                        className="app-input w-full text-sm"
                        placeholder="Notes (optional)"
                        value={notes[a.id] || ""}
                        onChange={(e) =>
                          setNotes({ ...notes, [a.id]: e.target.value })
                        }
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busyId === a.id}
                          onClick={() => void review(a.id, "approved")}
                          className="app-btn app-btn-primary text-xs"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyId === a.id}
                          onClick={() => void review(a.id, "rejected")}
                          className="app-btn app-btn-secondary text-xs"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      {isTenantLike ? (
        <>
          <h2 className="font-semibold">Your applications</h2>
          {outgoing.length === 0 ? (
            <EmptyState
              title="No applications yet"
              description="Apply to a listing above to get started."
            />
          ) : (
            <ul className="space-y-3">
              {outgoing.map((a) => (
                <li key={a.id} className="app-card p-4 sm:p-5 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {a.listing?.title || "Listing"} · {a.status}
                      </p>
                      <p className="text-xs text-muted mt-1">
                        {[a.listing?.city, a.listing?.state]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                    <p className="text-xs text-muted">
                      {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {a.message ? (
                    <p className="text-sm text-muted">{a.message}</p>
                  ) : null}
                  {a.landlordNotes ? (
                    <p className="text-xs text-muted">
                      Landlord notes: {a.landlordNotes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}

      {!isTenantLike && !isLandlordLike ? (
        <EmptyState
          title="Select a profile"
          description="Switch to a tenant/student profile to apply, or a landlord/estate manager profile to review applications."
        />
      ) : null}
    </div>
  );
}
