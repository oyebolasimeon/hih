"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Select from "@/components/ui/Select";
import { formatGBP } from "@/lib/format";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";

type InterestRow = {
  id: string;
  amount: number;
  status: string;
  projectedProfit: number;
  projectedTotalReturn: number;
  annualizedRoiPercent: number;
  note: string;
  adminNote: string;
  createdAt: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  propertyId: string;
  propertyName: string;
};

export default function InterestsClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "investors:write");
  const [rows, setRows] = useState<InterestRow[]>([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    const res = await fetch(`/api/admin/interests?${params}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load interests.");
      return;
    }
    setRows(data.interests || []);
  }, [status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, next: string) {
    if (!canWrite) return;
    setMessage("");
    setError("");
    const res = await fetch("/api/admin/interests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Update failed.");
      return;
    }
    setMessage("Interest updated.");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Investment interests
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Pledges from investors on Nova-listed opportunities. Review and update
          status after you follow up.
        </p>
      </div>

      <div className="max-w-xs">
        <Select
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            { value: "pending", label: "pending" },
            { value: "contacted", label: "contacted" },
            { value: "accepted", label: "accepted" },
            { value: "withdrawn", label: "withdrawn" },
            { value: "rejected", label: "rejected" },
          ]}
        />
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

      {loading ? (
        <>
          <PageHeaderSkeleton />
          <TableSkeleton rows={6} cols={5} />
        </>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No interests yet"
          description="When investors express interest on listed Nova properties, they appear here."
        />
      ) : (
        <div className="app-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Investor</th>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Projection</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.investorName}</p>
                    <p className="text-xs text-muted">{r.investorEmail}</p>
                    <Link
                      href={`/admin/investors/${r.investorId}`}
                      className="text-xs text-brand hover:underline"
                    >
                      Open investor
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.propertyName}</p>
                    {r.note ? (
                      <p className="text-xs text-muted mt-1 line-clamp-2">
                        Note: {r.note}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono">{formatGBP(r.amount)}</td>
                  <td className="px-4 py-3 text-xs">
                    <p>Profit {formatGBP(r.projectedProfit)}</p>
                    <p className="text-muted">
                      Total {formatGBP(r.projectedTotalReturn)} ·{" "}
                      {r.annualizedRoiPercent.toFixed(1)}% ann.
                    </p>
                  </td>
                  <td className="px-4 py-3 capitalize">{r.status}</td>
                  <td className="px-4 py-3">
                    {canWrite ? (
                      <Select
                        className="min-w-[8rem]"
                        value={r.status}
                        onChange={(v) => void updateStatus(r.id, v)}
                        options={[
                          { value: "pending", label: "pending" },
                          { value: "contacted", label: "contacted" },
                          { value: "accepted", label: "accepted" },
                          { value: "withdrawn", label: "withdrawn" },
                          { value: "rejected", label: "rejected" },
                        ]}
                      />
                    ) : null}
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
