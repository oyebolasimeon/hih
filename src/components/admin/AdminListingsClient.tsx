"use client";

import { useCallback, useEffect, useState } from "react";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";

type AdminListing = {
  id: string;
  title: string;
  listingType: string;
  description: string;
  address: { street: string; city: string; state: string; country: string };
  price: { amount: number; currency: string; period: string };
  images: { url: string; isPrimary?: boolean }[];
  availabilityStatus: string;
  verificationStatus: string;
  ownerName: string;
  ownerEmail: string;
  ownerProfileType: string;
  ownerVerified: boolean;
  createdAt: string | null;
};

function formatPrice(p: AdminListing["price"]) {
  try {
    return `${new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: p.currency || "NGN",
      maximumFractionDigits: 0,
    }).format(p.amount)} / ${p.period}`;
  } catch {
    return `${p.currency} ${p.amount} / ${p.period}`;
  }
}

export default function AdminListingsClient() {
  const { data: session } = useSession();
  const canVerify = hasPermission(session?.user?.permissions, "listings:verify");
  const [filter, setFilter] = useState("pending");
  const [rows, setRows] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/listings?status=${filter}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load listings.");
      return;
    }
    setRows(data.listings || []);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function review(id: string, decision: "approve" | "reject") {
    setBusyId(id);
    setError("");
    const res = await fetch("/api/admin/listings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        decision,
        notes: notes[id] || undefined,
      }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Review failed.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-56">
          <label className="block text-sm font-medium mb-1.5">Filter</label>
          <Select
            value={filter}
            onChange={setFilter}
            options={[
              { value: "pending", label: "Pending verification" },
              { value: "verified", label: "Verified" },
              { value: "rejected", label: "Rejected" },
              { value: "unverified", label: "Unverified" },
              { value: "all", label: "All" },
            ]}
          />
        </div>
        <button
          type="button"
          className="app-btn app-btn-secondary text-xs"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No listings"
          description="Nothing in this filter. Published listings awaiting verification will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((l) => {
            const img =
              l.images.find((i) => i.isPrimary)?.url || l.images[0]?.url;
            return (
              <li key={l.id} className="app-card p-4 sm:p-5 space-y-3">
                <div className="flex flex-col sm:flex-row gap-4">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-28 w-full sm:w-36 rounded object-cover border border-border"
                    />
                  ) : null}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-semibold">{l.title}</p>
                    <p className="text-sm text-muted">
                      {l.address.street}, {l.address.city}, {l.address.state}
                    </p>
                    <p className="text-sm">
                      {formatPrice(l.price)} · {l.listingType}
                    </p>
                    <p className="text-xs text-muted">
                      {l.ownerName} · {l.ownerEmail}
                      {l.ownerProfileType
                        ? ` · ${l.ownerProfileType.replace("_", " ")}`
                        : ""}
                      {l.ownerVerified ? " · owner KYC verified" : ""}
                    </p>
                    <p className="text-xs text-muted">
                      Availability: {l.availabilityStatus} · Verification:{" "}
                      {l.verificationStatus}
                      {l.createdAt
                        ? ` · ${new Date(l.createdAt).toLocaleString()}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted line-clamp-3">
                      {l.description}
                    </p>
                  </div>
                </div>

                {canVerify && l.verificationStatus === "pending" ? (
                  <div className="space-y-2 border-t border-border pt-3">
                    <textarea
                      className="app-input w-full min-h-[72px] text-sm"
                      placeholder="Reviewer notes (optional)"
                      value={notes[l.id] || ""}
                      onChange={(e) =>
                        setNotes((prev) => ({ ...prev, [l.id]: e.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="app-btn app-btn-primary text-xs"
                        disabled={busyId === l.id}
                        onClick={() => void review(l.id, "approve")}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="app-btn app-btn-secondary text-xs"
                        disabled={busyId === l.id}
                        onClick={() => void review(l.id, "reject")}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
