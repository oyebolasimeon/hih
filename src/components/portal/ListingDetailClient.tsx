"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Reveal } from "@/components/motion/Motion";
import EmptyState from "@/components/ui/EmptyState";
import ReviewsClient from "@/components/portal/ReviewsClient";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { useActiveProfile } from "@/hooks/useActiveProfile";

type ListingDetail = {
  id: string;
  listingType: string;
  title: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    country: string;
  };
  price: { amount: number; currency: string; period: string };
  amenities: string[];
  images: { url: string; isPrimary?: boolean }[];
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  verificationStatus: string;
  ownerUserId: string;
  ownerVerified: boolean;
  ownerDisplayName?: string;
};

function formatPriceAmount(p: ListingDetail["price"]) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: p.currency || "NGN",
      maximumFractionDigits: 0,
    }).format(p.amount);
  } catch {
    return `${p.currency} ${p.amount.toLocaleString()}`;
  }
}

function typeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1).replace("_", " ");
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface/40 p-3 text-center">
      <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-md bg-brand/10 text-brand">
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

export default function ListingDetailClient({ id }: { id: string }) {
  const { data: session } = useSession();
  const { isTenantLike } = useActiveProfile();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImage, setActiveImage] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/portal/search/${id}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Listing not found.");
      setListing(null);
      return;
    }
    setListing(data.listing);
    setActiveImage(0);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const images = useMemo(() => {
    if (!listing?.images?.length) return [];
    return listing.images.filter((img) => img.url);
  }, [listing]);

  const isOwner = session?.user?.id === listing?.ownerUserId;
  const showApply = isTenantLike && !isOwner;

  if (loading) return <FormSkeleton />;

  if (error || !listing) {
    return (
      <EmptyState
        title="Listing unavailable"
        description={
          error || "This listing may have been removed or is no longer available."
        }
      >
        <Link href="/portal/search" className="app-btn app-btn-primary text-sm">
          Back to search
        </Link>
      </EmptyState>
    );
  }

  const mainImage = images[activeImage]?.url;
  const locationLine = [
    listing.address.street,
    listing.address.city,
    listing.address.state,
  ]
    .filter(Boolean)
    .join(", ");

  const stats = [
    {
      key: "type",
      label: "Type",
      value: typeLabel(listing.listingType),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
          <path d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z" strokeLinejoin="round" />
        </svg>
      ),
    },
    listing.bedrooms != null
      ? {
          key: "beds",
          label: "Bedrooms",
          value: String(listing.bedrooms),
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
              <path d="M4 12h16M4 12v6h16v-6M8 12V8h8v4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        }
      : null,
    listing.bathrooms != null
      ? {
          key: "baths",
          label: "Bathrooms",
          value: String(listing.bathrooms),
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
              <path d="M6 10h12v8H6zM8 10V7a2 2 0 012-2h4a2 2 0 012 2v3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ),
        }
      : null,
    listing.sizeSqm != null
      ? {
          key: "size",
          label: "Size",
          value: `${listing.sizeSqm} sqm`,
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
              <path d="M4 8V4h4M4 16v4h4M16 4h4v4M16 20h4v-4" strokeLinecap="round" />
              <rect x="8" y="8" width="8" height="8" rx="1" />
            </svg>
          ),
        }
      : null,
  ].filter(Boolean) as {
    key: string;
    label: string;
    value: string;
    icon: ReactNode;
  }[];

  return (
    <div
      className={`space-y-8 ${
        showApply || (listing.ownerUserId && !isOwner)
          ? "pb-24 lg:pb-8"
          : "pb-8"
      }`}
    >
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/portal/search"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path
                fillRule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clipRule="evenodd"
              />
            </svg>
            Back to search
          </Link>
          <div className="flex flex-wrap gap-2">
            {listing.verificationStatus === "verified" ? (
              <span className="rounded-full bg-brand/15 border border-brand/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand">
                Verified listing
              </span>
            ) : null}
            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
              {typeLabel(listing.listingType)}
            </span>
          </div>
        </div>
      </Reveal>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8 lg:items-start">
        <div className="space-y-6 min-w-0">
          <Reveal delay={0.04}>
            <section className="space-y-3">
              {mainImage ? (
                <div className="relative aspect-[16/10] sm:aspect-[2/1] overflow-hidden rounded-xl border border-border bg-surface">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mainImage}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                </div>
              ) : (
                <div className="aspect-[16/10] sm:aspect-[2/1] rounded-xl border border-border bg-gradient-to-br from-surface to-surface-dark flex items-center justify-center">
                  <span className="text-sm text-muted">No photos available</span>
                </div>
              )}

              {images.length > 1 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {images.map((img, i) => (
                    <button
                      key={`${img.url}-${i}`}
                      type="button"
                      onClick={() => setActiveImage(i)}
                      className={`relative shrink-0 h-16 w-24 overflow-hidden rounded-lg border-2 transition-all ${
                        activeImage === i
                          ? "border-brand ring-2 ring-brand/30"
                          : "border-border opacity-80 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="space-y-2 lg:hidden">
              <h1 className="text-2xl sm:text-3xl font-display font-semibold tracking-tight">
                {listing.title}
              </h1>
              <p className="text-sm text-muted flex items-start gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4 shrink-0 mt-0.5">
                  <path d="M12 21s7-4.5 7-10a7 7 0 10-14 0c0 5.5 7 10 7 10z" />
                  <circle cx="12" cy="11" r="2.5" />
                </svg>
                {locationLine}
              </p>
              <p className="text-xl font-display font-semibold">
                {formatPriceAmount(listing.price)}
                <span className="text-base font-normal text-muted">
                  {" "}
                  / {listing.price.period}
                </span>
              </p>
            </div>
          </Reveal>

          {stats.length > 0 ? (
            <Reveal delay={0.1}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {stats.map((stat) => (
                  <StatItem
                    key={stat.key}
                    icon={stat.icon}
                    label={stat.label}
                    value={stat.value}
                  />
                ))}
              </div>
            </Reveal>
          ) : null}

          <Reveal delay={0.12}>
            <section className="app-card p-5 sm:p-6 space-y-5">
              <div>
                <h2 className="font-display text-lg font-semibold">About this home</h2>
                <p className="mt-3 text-sm text-muted leading-relaxed whitespace-pre-wrap">
                  {listing.description || "No description provided yet."}
                </p>
              </div>

              {listing.amenities?.length ? (
                <div>
                  <h3 className="text-sm font-semibold mb-3">Amenities</h3>
                  <ul className="flex flex-wrap gap-2">
                    {listing.amenities.map((a) => (
                      <li
                        key={a}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface/50 px-3 py-1.5 text-xs font-medium text-foreground"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="rounded-lg border border-border/70 bg-surface/30 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Listed by
                  </p>
                  <p className="mt-1 font-medium">
                    {listing.ownerDisplayName || "Landlord"}
                  </p>
                  {listing.ownerVerified ? (
                    <p className="text-xs text-brand mt-0.5 font-medium">
                      Verified owner
                    </p>
                  ) : null}
                </div>
                {listing.ownerUserId && !isOwner ? (
                  <Link
                    href={`/portal/messages?userId=${encodeURIComponent(listing.ownerUserId)}&listingId=${encodeURIComponent(listing.id)}&name=${encodeURIComponent(listing.ownerDisplayName || "Landlord")}&listingTitle=${encodeURIComponent(listing.title)}`}
                    className="app-btn app-btn-secondary text-sm"
                  >
                    Message
                  </Link>
                ) : null}
              </div>
            </section>
          </Reveal>

          <Reveal delay={0.14}>
            <section className="app-card p-5 sm:p-6 space-y-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Reviews</h2>
                <p className="text-sm text-muted mt-1">
                  See what others say about this property.
                </p>
              </div>
              <ReviewsClient listingId={listing.id} compact />
            </section>
          </Reveal>
        </div>

        <aside className="hidden lg:block lg:sticky lg:top-6 space-y-4">
          <Reveal delay={0.06}>
            <div className="app-card overflow-hidden">
              <div className="px-5 pt-5 pb-4 border-b border-border/60 bg-gradient-to-br from-brand/8 to-transparent">
                <h1 className="text-xl font-display font-semibold leading-snug">
                  {listing.title}
                </h1>
                <p className="mt-2 text-xs text-muted leading-relaxed">
                  {locationLine}
                </p>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-2xl font-display font-semibold">
                    {formatPriceAmount(listing.price)}
                  </p>
                  <p className="text-sm text-muted">per {listing.price.period}</p>
                </div>

                <div className="space-y-2">
                  {showApply ? (
                    <Link
                      href={`/portal/applications?listingId=${listing.id}`}
                      className="app-btn app-btn-primary w-full text-sm"
                    >
                      Apply for this home
                    </Link>
                  ) : null}
                  {listing.ownerUserId && !isOwner ? (
                    <Link
                      href={`/portal/messages?userId=${encodeURIComponent(listing.ownerUserId)}&listingId=${encodeURIComponent(listing.id)}&name=${encodeURIComponent(listing.ownerDisplayName || "Landlord")}&listingTitle=${encodeURIComponent(listing.title)}`}
                      className="app-btn app-btn-secondary w-full text-sm"
                    >
                      Message {listing.ownerDisplayName || "landlord"}
                    </Link>
                  ) : null}
                  {isOwner ? (
                    <Link
                      href={`/portal/listings`}
                      className="app-btn app-btn-secondary w-full text-sm"
                    >
                      Manage listing
                    </Link>
                  ) : null}
                </div>

                <ul className="space-y-2 text-sm border-t border-border/60 pt-4">
                  {listing.bedrooms != null ? (
                    <li className="flex justify-between">
                      <span className="text-muted">Bedrooms</span>
                      <span className="font-medium">{listing.bedrooms}</span>
                    </li>
                  ) : null}
                  {listing.bathrooms != null ? (
                    <li className="flex justify-between">
                      <span className="text-muted">Bathrooms</span>
                      <span className="font-medium">{listing.bathrooms}</span>
                    </li>
                  ) : null}
                  {listing.sizeSqm != null ? (
                    <li className="flex justify-between">
                      <span className="text-muted">Size</span>
                      <span className="font-medium">{listing.sizeSqm} sqm</span>
                    </li>
                  ) : null}
                  <li className="flex justify-between">
                    <span className="text-muted">Property type</span>
                    <span className="font-medium capitalize">
                      {typeLabel(listing.listingType)}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </Reveal>
        </aside>
      </div>

      {(showApply || (listing.ownerUserId && !isOwner)) && (
        <Reveal delay={0.16}>
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-border bg-card/95 backdrop-blur-md p-4 flex gap-2">
            {showApply ? (
              <Link
                href={`/portal/applications?listingId=${listing.id}`}
                className="app-btn app-btn-primary flex-1 text-sm"
              >
                Apply
              </Link>
            ) : null}
            {listing.ownerUserId && !isOwner ? (
              <Link
                href={`/portal/messages?userId=${encodeURIComponent(listing.ownerUserId)}&listingId=${encodeURIComponent(listing.id)}&name=${encodeURIComponent(listing.ownerDisplayName || "Landlord")}&listingTitle=${encodeURIComponent(listing.title)}`}
                className="app-btn app-btn-secondary flex-1 text-sm"
              >
                Message
              </Link>
            ) : null}
          </div>
        </Reveal>
      )}
    </div>
  );
}
