"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Select from "@/components/ui/Select";
import { formatGBP } from "@/lib/format";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

type PropertyRow = {
  id: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  name: string;
  address: string;
  imageUrls: string[];
  status: string;
  purchasePrice: number;
  currentValue: number;
};

export default function AdminPropertiesClient() {
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    const res = await fetch(`/api/admin/properties?${params}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load properties.");
      return;
    }
    setProperties(data.properties || []);
  }, [q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">
            Properties
          </h1>
          <p className="mt-1 text-sm text-muted">
            All properties across investors. Open an investor to manage their
            portfolio in depth.
          </p>
        </div>
      </div>

      <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-3 max-w-3xl">
        <input
          className="app-input"
          placeholder="Search name or address"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          className="sm:w-44"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "active" },
            { value: "inactive", label: "inactive" },
            { value: "sold", label: "sold" },
          ]}
        />
        <button type="submit" className="app-btn app-btn-secondary">
          Search
        </button>
      </form>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <>
          <PageHeaderSkeleton />
          <TableSkeleton rows={6} cols={5} />
        </>
      ) : properties.length === 0 ? (
        <EmptyState
          title="No properties found"
          description="Add properties from an investor detail page after they register."
        />
      ) : (
        <div className="app-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Investor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 overflow-hidden rounded bg-surface-dark shrink-0">
                        {p.imageUrls[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrls[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted line-clamp-1">{p.address}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p>{p.investorName}</p>
                    <p className="text-xs text-muted">{p.investorEmail}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {formatGBP(p.currentValue)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/investors/${p.investorId}`}
                      className="text-brand font-medium hover:underline"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
