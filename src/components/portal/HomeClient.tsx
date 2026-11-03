"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format, parseISO, startOfMonth } from "date-fns";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import Calendar, { type CalendarEvent } from "@/components/ui/Calendar";
import Select from "@/components/ui/Select";

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

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export default function HomeClient() {
  const [homes, setHomes] = useState<HomePayload[]>([]);
  const [bills, setBills] = useState<
    {
      id: string;
      service: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeLeaseId, setActiveLeaseId] = useState("");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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
    const nextHomes = (data.homes || []) as HomePayload[];
    setHomes(nextHomes);
    setBills(data.utilityBills || []);
    if (!activeLeaseId && nextHomes[0]) setActiveLeaseId(nextHomes[0].leaseId);
  }, [activeLeaseId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const home = homes.find((h) => h.leaseId === activeLeaseId) || homes[0];

  const events: CalendarEvent[] = useMemo(() => {
    if (!home) return [];
    const list: CalendarEvent[] = [];
    if (home.rentDue) {
      list.push({
        id: `rent-${home.leaseId}`,
        title: home.rentDue.paid ? "Rent paid" : "Rent due",
        startDate: home.rentDue.periodStart,
        endDate: home.rentDue.periodEnd,
        tone: home.rentDue.paid ? "brand" : home.rentDue.expired ? "warn" : "muted",
        meta: money(home.rentAmount, home.currency),
      });
    }
    for (const n of home.exitNotices) {
      list.push({
        id: `exit-${n.id}`,
        title: "Vacate date",
        startDate: n.proposedVacateDate,
        endDate: n.proposedVacateDate,
        tone: "warn",
        meta: n.status,
      });
    }
    for (const p of home.recentPayments.slice(0, 6)) {
      list.push({
        id: `pay-${p.id}`,
        title: p.purpose.replace(/_/g, " "),
        startDate: p.createdAt,
        endDate: p.createdAt,
        tone: "brand",
        meta: money(p.amount, p.currency),
      });
    }
    return list;
  }, [home]);

  if (loading) return <TableSkeleton rows={5} />;

  if (error) {
    return (
      <EmptyState title="Couldn’t load My Home" description={error}>
        <Link href="/portal/profiles" className="app-btn app-btn-secondary text-sm">
          Check profile
        </Link>
      </EmptyState>
    );
  }

  if (!home) {
    return (
      <EmptyState
        title="No linked home yet"
        description="Accept a landlord invite or sign a lease — then your property, costs, documents, bills and exit options appear here."
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/search" className="app-btn app-btn-primary text-sm">
            Browse homes
          </Link>
          <Link
            href="/portal/applications"
            className="app-btn app-btn-secondary text-sm"
          >
            Applications
          </Link>
        </div>
      </EmptyState>
    );
  }

  const address = [
    home.listing?.street,
    home.listing?.city,
    home.listing?.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-6">
      {homes.length > 1 ? (
        <div className="max-w-md">
          <Select
            label="Your homes"
            value={home.leaseId}
            onChange={setActiveLeaseId}
            options={homes.map((h) => ({
              value: h.leaseId,
              label: `${h.listing?.title || "Home"} · ${h.status.replace(/_/g, " ")}`,
            }))}
          />
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="relative">
          {home.listing?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={home.listing.imageUrl}
              alt=""
              className="h-48 sm:h-56 w-full object-cover"
            />
          ) : (
            <div className="h-40 sm:h-48 w-full bg-gradient-to-br from-brand/25 via-surface to-teal/20" />
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/95 via-background/70 to-transparent p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
              {home.status.replace(/_/g, " ")}
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold">
              {home.listing?.title || "Your home"}
            </h2>
            <p className="mt-1 text-sm text-muted">{address}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 p-5 sm:p-6 border-t border-border">
          <div>
            <p className="text-xs text-muted">Rent</p>
            <p className="mt-1 text-lg font-semibold">
              {money(home.rentAmount, home.currency)}
              <span className="text-sm font-normal text-muted">
                {" "}
                / {home.paymentPeriod}
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs text-muted">Landlord</p>
            <p className="mt-1 font-medium">{home.landlordName}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Current period</p>
            <p className="mt-1 font-medium">
              {home.rentDue
                ? home.rentDue.paid
                  ? "Paid"
                  : home.rentDue.expired
                    ? "Overdue"
                    : "Due"
                : "—"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 px-5 sm:px-6 pb-5 sm:pb-6">
          <Link href="/portal/payments" className="app-btn app-btn-primary text-xs">
            Pay rent / bills
          </Link>
          <Link
            href="/portal/messages"
            className="app-btn app-btn-secondary text-xs"
          >
            Conversations
          </Link>
          <Link
            href="/portal/building-issues"
            className="app-btn app-btn-secondary text-xs"
          >
            Report building issue
          </Link>
          <Link
            href="/portal/maintenance"
            className="app-btn app-btn-secondary text-xs"
          >
            Maintenance
          </Link>
          <Link
            href="/portal/exit-notices"
            className="app-btn app-btn-secondary text-xs"
          >
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
      </section>

      <div className="grid lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">Home calendar</h3>
              <p className="text-xs text-muted">
                Rent periods, payments and vacate dates
              </p>
            </div>
          </div>
          <Calendar
            month={month}
            onMonthChange={setMonth}
            events={events}
            selectedDay={selectedDay}
            onDayClick={(day) => setSelectedDay(day)}
          />
          {selectedDay ? (
            <p className="text-xs text-muted">
              Selected {format(selectedDay, "EEE, d MMM yyyy")}
              {events.some((e) => {
                try {
                  return (
                    format(parseISO(String(e.startDate).slice(0, 10)), "yyyy-MM-dd") ===
                    format(selectedDay, "yyyy-MM-dd")
                  );
                } catch {
                  return false;
                }
              })
                ? " · has home activity"
                : ""}
            </p>
          ) : null}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <section className="app-card p-4 sm:p-5 space-y-3">
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
                    <span className="ml-2 text-[11px] uppercase tracking-wider text-muted">
                      {d.kind.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="app-card p-4 sm:p-5 space-y-3">
            <h3 className="font-semibold text-sm">Bills paid</h3>
            {home.recentPayments.length === 0 ? (
              <p className="text-sm text-muted">No lease payments yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {home.recentPayments.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-medium capitalize">
                        {p.purpose.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(p.createdAt).toLocaleDateString()} · {p.status}
                      </p>
                    </div>
                    <p className="shrink-0 font-medium">
                      {money(p.amount, p.currency)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="app-card p-4 sm:p-5 space-y-3">
            <h3 className="font-semibold text-sm">History & exit</h3>
            <p className="text-xs text-muted">
              {home.conversations.length} conversation
              {home.conversations.length === 1 ? "" : "s"} ·{" "}
              {home.exitNotices.length} exit notice
              {home.exitNotices.length === 1 ? "" : "s"}
            </p>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {home.history.slice(0, 8).map((h, i) => (
                <li key={`${h.label}-${i}`} className="text-sm">
                  <p className="font-medium">{h.label}</p>
                  {h.detail ? (
                    <p className="text-xs text-muted">{h.detail}</p>
                  ) : null}
                  <p className="text-[11px] text-muted">
                    {new Date(h.at).toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {bills.length > 0 ? (
        <section className="app-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-sm">Utility bills</h3>
            <Link
              href="/portal/utilities"
              className="text-xs text-brand hover:underline"
            >
              All utilities
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {bills.slice(0, 6).map((b) => (
              <li
                key={b.id}
                className="flex justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
              >
                <span>
                  {b.service}
                  <span className="text-muted"> · {b.status}</span>
                </span>
                <span className="text-muted shrink-0">
                  {money(b.amount, b.currency)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
