"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

type HomePayload = {
  leaseId: string;
  status: string;
  rentAmount: number;
  currency: string;
  paymentPeriod: string;
  startDate: string;
  endDate: string | null;
  documentUrl: string | null;
  documentNumber: string | null;
  landlordName: string;
  listing: {
    id: string;
    title: string;
    street?: string;
    city?: string;
    state?: string;
    imageUrl: string | null;
  } | null;
  rentDue: {
    periodStart: string;
    periodEnd: string;
    paid: boolean;
    expired: boolean;
  } | null;
  recentPayments: {
    id: string;
    amount: number;
    currency: string;
    purpose: string;
    status: string;
    createdAt: string;
  }[];
  exitNotices: {
    id: string;
    status: string;
    noticeType: string;
    proposedVacateDate: string;
    documentUrl: string | null;
  }[];
  conversations: { id: string; lastMessageAt: string }[];
  documents: { kind: string; label: string; url: string }[];
  history: { at: string; label: string; detail: string }[];
};

export default function HomeClient() {
  const [homes, setHomes] = useState<HomePayload[]>([]);
  const [bills, setBills] = useState<
    { id: string; service: string; amount: number; currency: string; status: string; createdAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/home");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load your home.");
      return;
    }
    setHomes(data.homes || []);
    setBills(data.utilityBills || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <TableSkeleton rows={4} />;

  if (error) {
    return (
      <EmptyState title="Couldn’t load My Home" description={error}>
        <Link href="/portal/profiles" className="app-btn app-btn-secondary text-sm">
          Check profile
        </Link>
      </EmptyState>
    );
  }

  if (homes.length === 0) {
    return (
      <EmptyState
        title="No linked home yet"
        description="When you accept a landlord invite or sign a lease, your property, costs, documents, bills and exit options appear here."
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/search" className="app-btn app-btn-primary text-sm">
            Browse homes
          </Link>
          <Link href="/portal/applications" className="app-btn app-btn-secondary text-sm">
            Applications
          </Link>
        </div>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-8">
      {homes.map((home) => (
        <section key={home.leaseId} className="space-y-4">
          <div className="app-card overflow-hidden">
            {home.listing?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={home.listing.imageUrl}
                alt=""
                className="h-44 w-full object-cover"
              />
            ) : null}
            <div className="p-5 sm:p-6 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">
                    {home.status.replace(/_/g, " ")}
                  </p>
                  <h2 className="font-display text-xl font-semibold mt-1">
                    {home.listing?.title || "Your home"}
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    {[home.listing?.street, home.listing?.city, home.listing?.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p className="text-sm text-muted mt-1">
                    Landlord: {home.landlordName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {home.currency} {home.rentAmount.toLocaleString()} /{" "}
                    {home.paymentPeriod}
                  </p>
                  {home.rentDue ? (
                    <p className="text-xs text-muted mt-1">
                      Period{" "}
                      {new Date(home.rentDue.periodStart).toLocaleDateString()} –{" "}
                      {new Date(home.rentDue.periodEnd).toLocaleDateString()}
                      {home.rentDue.paid
                        ? " · paid"
                        : home.rentDue.expired
                          ? " · overdue"
                          : " · due"}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/portal/payments" className="app-btn app-btn-primary text-xs">
                  Pay rent / bills
                </Link>
                <Link href="/portal/messages" className="app-btn app-btn-secondary text-xs">
                  Conversations
                </Link>
                <Link href="/portal/maintenance" className="app-btn app-btn-secondary text-xs">
                  Repair request
                </Link>
                <Link
                  href="/portal/building-issues"
                  className="app-btn app-btn-secondary text-xs"
                >
                  Report building issue
                </Link>
                <Link href="/portal/exit-notices" className="app-btn app-btn-secondary text-xs">
                  Exit / vacate
                </Link>
                {home.documentUrl ? (
                  <a
                    href={home.documentUrl}
                    className="app-btn app-btn-secondary text-xs"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Agreement PDF
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="app-card p-4 sm:p-5 space-y-3">
              <h3 className="font-semibold text-sm">Documents</h3>
              {home.documents.length === 0 ? (
                <p className="text-sm text-muted">No documents yet.</p>
              ) : (
                <ul className="space-y-2">
                  {home.documents.map((d) => (
                    <li key={`${d.kind}-${d.url}`}>
                      <a
                        href={d.url}
                        className="text-sm text-brand hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {d.label}
                      </a>
                      <span className="text-xs text-muted ml-2">
                        {d.kind.replace(/_/g, " ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="app-card p-4 sm:p-5 space-y-3">
              <h3 className="font-semibold text-sm">Bills paid</h3>
              {home.recentPayments.length === 0 ? (
                <p className="text-sm text-muted">No payments on this lease yet.</p>
              ) : (
                <ul className="space-y-2">
                  {home.recentPayments.map((p) => (
                    <li key={p.id} className="text-sm flex justify-between gap-2">
                      <span>
                        {p.purpose.replace(/_/g, " ")} · {p.status}
                      </span>
                      <span className="text-muted shrink-0">
                        {p.currency} {p.amount.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="app-card p-4 sm:p-5 space-y-3">
              <h3 className="font-semibold text-sm">History</h3>
              {home.history.length === 0 ? (
                <p className="text-sm text-muted">No history yet.</p>
              ) : (
                <ul className="space-y-2">
                  {home.history.map((h, i) => (
                    <li key={`${h.label}-${i}`} className="text-sm">
                      <span className="font-medium">{h.label}</span>
                      {h.detail ? (
                        <span className="text-muted"> · {h.detail}</span>
                      ) : null}
                      <p className="text-xs text-muted">
                        {new Date(h.at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="app-card p-4 sm:p-5 space-y-3">
              <h3 className="font-semibold text-sm">Exit & conversations</h3>
              <p className="text-xs text-muted">
                {home.conversations.length} conversation
                {home.conversations.length === 1 ? "" : "s"} linked to this
                property.
              </p>
              {home.exitNotices.length === 0 ? (
                <p className="text-sm text-muted">
                  No exit notice served yet. Request early exit from Exit notices
                  when you need to leave.
                </p>
              ) : (
                <ul className="space-y-2">
                  {home.exitNotices.map((n) => (
                    <li key={n.id} className="text-sm">
                      {n.noticeType.replace(/_/g, " ")} · {n.status}
                      <p className="text-xs text-muted">
                        Vacate{" "}
                        {new Date(n.proposedVacateDate).toLocaleDateString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/portal/exit-notices"
                className="text-xs text-brand hover:underline"
              >
                Manage exit notices
              </Link>
            </div>
          </div>
        </section>
      ))}

      {bills.length > 0 ? (
        <section className="app-card p-4 sm:p-5 space-y-3">
          <h3 className="font-semibold text-sm">Utility bills</h3>
          <ul className="space-y-2">
            {bills.slice(0, 8).map((b) => (
              <li key={b.id} className="text-sm flex justify-between gap-2">
                <span>
                  {b.service} · {b.status}
                </span>
                <span className="text-muted">
                  {b.currency} {b.amount.toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
          <Link href="/portal/utilities" className="text-xs text-brand hover:underline">
            All utilities
          </Link>
        </section>
      ) : null}
    </div>
  );
}
