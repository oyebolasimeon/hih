"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";

export type PublicListing = {
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
  images: { url: string; isPrimary?: boolean; mediaType?: "image" | "video" }[];
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  verificationStatus: string;
  featured: boolean;
  ownerDisplayName?: string;
  ownerVerified?: boolean;
};

function formatPriceAmount(p: PublicListing["price"]) {
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
      <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-md bg-teal/15 text-teal-dark">
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-navy">{value}</p>
    </div>
  );
}

export default function PublicListingDetail({
  listing,
}: {
  listing: PublicListing;
}) {
  const [activeImage, setActiveImage] = useState(0);

  const images = useMemo(
    () => listing.images.filter((img) => img.url),
    [listing.images]
  );

  const activeMedia = images[activeImage];
  const mainUrl = activeMedia?.url;
  const mainIsVideo =
    activeMedia?.mediaType === "video" ||
    /\.(mp4|webm|mov|m4v)(\?|$)/i.test(mainUrl || "");

  const locationLine = [
    listing.address.street,
    listing.address.city,
    listing.address.state,
    listing.address.country,
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
    <div className="pb-28 lg:pb-16">
      <section className="bg-navy text-sand">
        <div className="mx-auto max-w-7xl px-5 py-10 sm:px-6 lg:px-8">
          <Link
            href="/listings"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-teal hover:text-teal-light"
          >
            ← Back to listings
          </Link>
          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2">
                {listing.verificationStatus === "verified" ? (
                  <span className="rounded-full bg-teal/20 border border-teal/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-teal">
                    Verified
                  </span>
                ) : null}
                {listing.featured ? (
                  <span className="rounded-full bg-sand/15 border border-sand/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sand">
                    Featured
                  </span>
                ) : null}
                <span className="rounded-full border border-sand/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sand/80">
                  {typeLabel(listing.listingType)}
                </span>
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                {listing.title}
              </h1>
              <p className="mt-3 text-sm text-sand/70 sm:text-base">{locationLine}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-wider text-sand/60">Rent</p>
              <p className="mt-1 font-display text-2xl font-semibold text-sand">
                {formatPriceAmount(listing.price)}
                <span className="text-base font-normal text-sand/65">
                  {" "}
                  / {listing.price.period}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="site-section">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10 lg:items-start">
            <div className="space-y-8 min-w-0">
              <div className="space-y-3">
                {mainUrl ? (
                  <div className="relative aspect-[16/10] sm:aspect-[2/1] overflow-hidden rounded-xl border border-border bg-surface">
                    {mainIsVideo ? (
                      <video
                        key={mainUrl}
                        src={mainUrl}
                        className="h-full w-full object-cover bg-black"
                        controls
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mainUrl}
                        alt={listing.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="aspect-[16/10] rounded-xl border border-border bg-surface flex items-center justify-center">
                    <span className="text-sm text-muted">No photos available</span>
                  </div>
                )}

                {images.length > 1 ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, i) => {
                      const thumbIsVideo =
                        img.mediaType === "video" ||
                        /\.(mp4|webm|mov|m4v)(\?|$)/i.test(img.url);
                      return (
                        <button
                          key={`${img.url}-${i}`}
                          type="button"
                          onClick={() => setActiveImage(i)}
                          className={`relative shrink-0 h-16 w-24 overflow-hidden rounded-lg border-2 transition-all ${
                            activeImage === i
                              ? "border-teal ring-2 ring-teal/30"
                              : "border-border opacity-80 hover:opacity-100"
                          }`}
                        >
                          {thumbIsVideo ? (
                            <>
                              <video
                                src={img.url}
                                className="h-full w-full object-cover bg-black"
                                muted
                                playsInline
                                preload="metadata"
                              />
                              <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[9px] font-semibold uppercase text-white">
                                Video
                              </span>
                            </>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img.url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              {stats.length > 0 ? (
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
              ) : null}

              <div className="rounded-xl border border-border bg-background p-5 sm:p-6 space-y-6">
                <div>
                  <h2 className="font-display text-xl font-semibold text-navy">
                    About this home
                  </h2>
                  <p className="mt-3 text-sm sm:text-base text-muted leading-relaxed whitespace-pre-wrap">
                    {listing.description || "No description provided yet."}
                  </p>
                </div>

                {listing.amenities.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-navy mb-3">
                      Amenities
                    </h3>
                    <ul className="flex flex-wrap gap-2">
                      {listing.amenities.map((a) => (
                        <li
                          key={a}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium text-navy"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-teal" aria-hidden />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div>
                  <h3 className="text-sm font-semibold text-navy mb-2">Location</h3>
                  <p className="text-sm text-muted">{locationLine}</p>
                </div>
              </div>
            </div>

            <aside className="mt-8 lg:mt-0 space-y-4 lg:sticky lg:top-28">
              <div className="rounded-xl border border-border bg-background p-5 space-y-4 shadow-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Listed by
                  </p>
                  <p className="mt-1 font-medium text-navy">
                    {listing.ownerDisplayName || "Property owner"}
                  </p>
                  {listing.ownerVerified ? (
                    <p className="mt-1 text-xs text-teal-dark font-medium">
                      Verified owner
                    </p>
                  ) : null}
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  Guests can browse every detail. Create a free account to apply
                  for this home.
                </p>
                <Link
                  href={`/register?next=${encodeURIComponent(`/portal/search/${listing.id}`)}`}
                  className="site-btn site-btn-teal w-full text-center"
                >
                  Sign up to apply
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(`/portal/search/${listing.id}`)}`}
                  className="site-btn site-btn-outline w-full text-center"
                >
                  Sign in
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-navy">
              {formatPriceAmount(listing.price)}
              <span className="font-normal text-muted">
                {" "}
                / {listing.price.period}
              </span>
            </p>
          </div>
          <Link
            href={`/register?next=${encodeURIComponent(`/portal/search/${listing.id}`)}`}
            className="site-btn site-btn-teal text-sm shrink-0"
          >
            Apply
          </Link>
        </div>
      </div>
    </div>
  );
}
