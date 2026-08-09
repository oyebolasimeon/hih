"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatGBP } from "@/lib/format";
import { CardGridSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

type Opportunity = {
  id: string;
  name: string;
  address: string;
  imageUrls: string[];
  description: string;
  roiMode: string;
  roiValue: number;
  periodLabel: string;
  minInvestment: number;
  sampleProjection: {
    profit: number;
    totalReturn: number;
    annualizedRoiPercent: number;
    rateLabel: string;
  };
  myInterest: { id: string; amount: number; status: string } | null;
};

export default function OpportunitiesClient() {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const res = await fetch("/api/portal/opportunities");
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Unable to load opportunities.");
        return;
      }
      setItems(data.properties || []);
    })();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <CardGridSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Opportunities
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Open Nova Elite listings you can invest in. Your own holdings never
          come from self-listing — they are assigned by Nova outright, or you
          express interest here for Nova-run opportunities.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          title="No open opportunities"
          description="When Nova lists a property for investment, it will appear here with full ROI details."
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/portal/opportunities/${p.id}`}
              className="app-card overflow-hidden hover:border-brand/50 transition-colors group"
            >
              <div className="aspect-[16/10] bg-surface-dark overflow-hidden">
                {p.imageUrls[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrls[0]}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    No image yet
                  </div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold leading-snug">{p.name}</h2>
                  {p.myInterest ? (
                    <span className="shrink-0 rounded bg-brand-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                      {p.myInterest.status}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-muted line-clamp-1">{p.address}</p>
                <p className="text-sm text-muted line-clamp-2">
                  {p.description || "View full details and investment calculator."}
                </p>
                <div className="pt-1 flex items-end justify-between gap-2 border-t border-border">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted">
                      Sample return
                    </p>
                    <p className="font-mono text-sm font-semibold">
                      {formatGBP(p.sampleProjection.profit)}
                    </p>
                    <p className="text-[11px] text-muted">
                      on {formatGBP(p.minInvestment)} · {p.periodLabel}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-brand">
                    Explore →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
