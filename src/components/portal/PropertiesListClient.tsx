"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { formatGBP } from "@/lib/format";

type PropertyCard = {
  id: string;
  name: string;
  nickname: string;
  address: string;
  propertyType: string;
  zone: string;
  tags: string[];
  imageUrls: string[];
  status: string;
  currentValue: number;
  monthlyRent: number;
  acquisitionType: string | null;
};

const FILTERS = ["all", "active", "pending", "inactive", "sold"] as const;

export default function PropertiesListClient({
  properties,
}: {
  properties: PropertyCard[];
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return properties;
    return properties.filter((p) => p.status === filter);
  }, [properties, filter]);

  if (properties.length === 0) {
    return (
      <EmptyState
        title="No assigned properties yet"
        description="When Nova assigns a property to your portfolio (outright purchase / onboarding), it will appear here. Meanwhile you can review open investment opportunities."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div
        className="inline-flex flex-wrap rounded-md border border-border p-0.5 bg-surface gap-0.5"
        role="group"
        aria-label="Status filter"
      >
        {FILTERS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded capitalize ${
              filter === key
                ? "bg-brand text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={`No ${filter} properties`}
          description="Try another status filter."
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link
              key={p.id}
              href={`/portal/properties/${p.id}`}
              className="app-card overflow-hidden hover:border-brand/40 transition-colors"
            >
              <div className="aspect-[16/10] bg-surface-dark">
                {p.imageUrls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrls[0]}
                    alt={p.nickname || p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">
                      {p.nickname || p.name}
                    </h2>
                    {p.nickname ? (
                      <p className="text-xs text-muted">{p.name}</p>
                    ) : null}
                  </div>
                  <span className="text-[10px] uppercase tracking-wide rounded bg-brand-subtle px-1.5 py-0.5 text-foreground shrink-0">
                    {p.acquisitionType === "nova_investment"
                      ? "Via investment"
                      : "Nova outright"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted line-clamp-2">{p.address}</p>
                {(p.propertyType || p.zone || p.tags.length > 0) && (
                  <p className="mt-2 text-xs text-muted">
                    {[p.propertyType, p.zone, ...p.tags].filter(Boolean).join(" · ")}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{formatGBP(p.currentValue)}</p>
                    {p.monthlyRent > 0 ? (
                      <p className="text-xs text-muted">
                        {formatGBP(p.monthlyRent)}/mo rent
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs uppercase tracking-wide text-muted">
                    {p.status}
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
