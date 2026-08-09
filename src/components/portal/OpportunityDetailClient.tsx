"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatGBP } from "@/lib/format";
import { FormSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";
import { projectInvestment } from "@/lib/investment";
import ImageViewer from "@/components/ui/ImageViewer";

type PropertyDetail = {
  id: string;
  name: string;
  address: string;
  imageUrls: string[];
  description: string;
  highlights: string[];
  purchasePrice: number;
  currentValue: number;
  roiMode: "percent" | "fixed_per_1000";
  roiValue: number;
  roiPeriodMonths: number;
  periodLabel: string;
  minInvestment: number;
  maxInvestment: number | null;
  targetRaise: number | null;
};

type Projection = {
  amount: number;
  profit: number;
  totalReturn: number;
  annualizedRoiPercent: number;
  monthlyAverageProfit: number;
  multiple: number;
  periodMonths: number;
  rateLabel: string;
};

export default function OpportunityDetailClient({ id }: { id: string }) {
  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [projection, setProjection] = useState<Projection | null>(null);
  const [interestTotals, setInterestTotals] = useState({
    pledgedAmount: 0,
    pledgeCount: 0,
  });
  const [myInterests, setMyInterests] = useState<
    { id: string; amount: number; status: string; createdAt: string }[]
  >([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/portal/opportunities/${id}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load opportunity.");
      return;
    }
    setProperty(data.property);
    setProjection(data.projection);
    setInterestTotals(data.interestTotals || { pledgedAmount: 0, pledgeCount: 0 });
    setMyInterests(data.myInterests || []);
    setAmount(String(data.property.minInvestment || 1000));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const liveProjection = useMemo(() => {
    if (!property) return null;
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return projection;
    return projectInvestment({
      amount: n,
      roiMode: property.roiMode,
      roiValue: property.roiValue,
      roiPeriodMonths: property.roiPeriodMonths,
    });
  }, [amount, property, projection]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!property) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: property.id,
        amount: Number(amount),
        note,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Unable to submit interest.");
      return;
    }
    setMessage(
      "Interest submitted. Nova will review and contact you — this is not an automatic commitment."
    );
    setNote("");
    await load();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <FormSkeleton />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="space-y-4">
        <Link href="/portal/opportunities" className="text-sm text-muted hover:text-foreground">
          ← Opportunities
        </Link>
        <p className="text-sm text-danger">{error || "Not found."}</p>
      </div>
    );
  }

  const images = property.imageUrls.length
    ? property.imageUrls
    : [];

  const progress =
    property.targetRaise && property.targetRaise > 0
      ? Math.min(100, (interestTotals.pledgedAmount / property.targetRaise) * 100)
      : null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal/opportunities"
          className="text-sm text-muted hover:text-foreground"
        >
          ← Opportunities
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-display font-semibold">
          {property.name}
        </h1>
        <p className="text-sm text-muted">{property.address}</p>
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

      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="space-y-4">
          <div className="app-card overflow-hidden">
            <button
              type="button"
              className="aspect-[16/10] w-full bg-surface-dark relative group"
              onClick={() => {
                if (!images.length) return;
                setViewerIndex(0);
                setViewerOpen(true);
              }}
            >
              {images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={images[0]}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted">
                  Image placeholder — Nova will add photos
                </div>
              )}
              {images.length ? (
                <span className="absolute bottom-3 right-3 rounded bg-black/65 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition">
                  Open viewer · zoom · star · download
                </span>
              ) : null}
            </button>
            {images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto p-3">
                {images.map((url, i) => (
                  <button
                    key={url + i}
                    type="button"
                    onClick={() => {
                      setViewerIndex(i);
                      setViewerOpen(true);
                    }}
                    className="h-14 w-20 shrink-0 overflow-hidden rounded border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
            <ImageViewer
              images={images}
              initialIndex={viewerIndex}
              open={viewerOpen}
              onClose={() => setViewerOpen(false)}
              title={property.name}
            />
          </div>

          <section className="app-card p-5 space-y-3">
            <h2 className="font-semibold">About this property</h2>
            <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
              {property.description || "Details coming soon from Nova Elite Homes."}
            </p>
            {property.highlights?.length ? (
              <ul className="space-y-1.5">
                {property.highlights.map((h) => (
                  <li key={h} className="text-sm flex gap-2">
                    <span className="text-brand font-bold">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="app-card p-5 grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                Purchase price
              </p>
              <p className="mt-1 font-mono text-lg">{formatGBP(property.purchasePrice)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                Current value
              </p>
              <p className="mt-1 font-mono text-lg">{formatGBP(property.currentValue)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">ROI terms</p>
              <p className="mt-1 text-sm font-medium">
                {property.roiMode === "percent"
                  ? `${property.roiValue}% over ${property.periodLabel}`
                  : `£${property.roiValue.toLocaleString("en-GB")} per £1,000 over ${property.periodLabel}`}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">
                Investment range
              </p>
              <p className="mt-1 text-sm font-medium">
                From {formatGBP(property.minInvestment)}
                {property.maxInvestment != null
                  ? ` to ${formatGBP(property.maxInvestment)}`
                  : ""}
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 self-start">
          <form onSubmit={onSubmit} className="app-card p-5 space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold">
                Investment calculator
              </h2>
              <p className="text-xs text-muted mt-1">
                Transparent projections from Nova&apos;s published terms. Expressing
                interest does not move funds automatically.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="amount">
                How much do you want to invest?
              </label>
              <input
                id="amount"
                type="number"
                min={property.minInvestment}
                max={property.maxInvestment ?? undefined}
                step="1"
                required
                className="app-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {liveProjection ? (
              <div className="rounded-lg border border-border bg-surface/50 p-3 space-y-2">
                <p className="text-[11px] text-muted">{liveProjection.rateLabel}</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted">Projected profit</p>
                    <p className="font-mono font-semibold text-brand">
                      {formatGBP(liveProjection.profit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Total returned</p>
                    <p className="font-mono font-semibold">
                      {formatGBP(liveProjection.totalReturn)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Avg / month</p>
                    <p className="font-mono">
                      {formatGBP(liveProjection.monthlyAverageProfit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Annualised ROI</p>
                    <p className="font-mono">
                      {liveProjection.annualizedRoiPercent.toFixed(2)}%
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted">Multiple on capital</p>
                    <p className="font-mono">{liveProjection.multiple.toFixed(2)}x</p>
                  </div>
                </div>
              </div>
            ) : null}

            {property.targetRaise ? (
              <div>
                <div className="flex justify-between text-xs text-muted mb-1">
                  <span>Interest so far</span>
                  <span>
                    {formatGBP(interestTotals.pledgedAmount)} /{" "}
                    {formatGBP(property.targetRaise)}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-dark overflow-hidden">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${progress || 0}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted">
                  {interestTotals.pledgeCount} expression
                  {interestTotals.pledgeCount === 1 ? "" : "s"} of interest
                </p>
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="note">
                Note to Nova (optional)
              </label>
              <textarea
                id="note"
                className="app-input min-h-[72px]"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any questions or preferences"
              />
            </div>

            <button
              type="submit"
              className="app-btn app-btn-primary w-full"
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Express interest"}
            </button>
          </form>

          {myInterests.length ? (
            <section className="app-card p-4 space-y-2">
              <h3 className="text-sm font-semibold">Your interest history</h3>
              {myInterests.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-2 text-xs border-t border-border pt-2 first:border-0 first:pt-0"
                >
                  <span>
                    {formatGBP(i.amount)} ·{" "}
                    <span className="capitalize">{i.status}</span>
                  </span>
                  <span className="text-muted">
                    {new Date(i.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
