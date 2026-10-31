"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import ListingMap from "@/components/ListingMap";

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
    lat?: number;
    lng?: number;
  };
  price: { amount: number; currency: string; period: string };
  amenities: string[];
  images: { url: string; isPrimary?: boolean; mediaType?: "image" | "video" }[];
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  verificationStatus: string;
  featured: boolean;
  mapEnabled?: boolean;
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
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
}

function isVideoMedia(img: { mediaType?: string; url: string }) {
  return (
    img.mediaType === "video" || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(img.url)
  );
}

export default function PublicListingDetail({
  listing,
}: {
  listing: PublicListing;
}) {
  const reduce = useReducedMotion();
  const [activeImage, setActiveImage] = useState(0);

  const images = useMemo(
    () => listing.images.filter((img) => img.url),
    [listing.images]
  );

  const activeMedia = images[activeImage];
  const mainUrl = activeMedia?.url;
  const mainIsVideo = activeMedia ? isVideoMedia(activeMedia) : false;

  const locationLine = [
    listing.address.street,
    listing.address.city,
    listing.address.state,
  ]
    .filter(Boolean)
    .join(", ");

  const facts = [
    { label: "Type", value: typeLabel(listing.listingType) },
    listing.bedrooms != null
      ? { label: "Bedrooms", value: String(listing.bedrooms) }
      : null,
    listing.bathrooms != null
      ? { label: "Bathrooms", value: String(listing.bathrooms) }
      : null,
    listing.sizeSqm != null
      ? { label: "Size", value: `${listing.sizeSqm} sqm` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const applyHref = `/register?next=${encodeURIComponent(`/portal/search/${listing.id}`)}`;
  const loginHref = `/login?next=${encodeURIComponent(`/portal/search/${listing.id}`)}`;

  return (
    <div className="pb-28 lg:pb-0">
      <section className="relative min-h-[72svh] overflow-hidden bg-navy">
        {mainUrl ? (
          mainIsVideo ? (
            <video
              key={mainUrl}
              src={mainUrl}
              className="absolute inset-0 h-full w-full object-cover"
              controls={false}
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainUrl}
              alt={listing.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/55 to-navy/25" />

        <div className="relative mx-auto flex min-h-[72svh] max-w-7xl flex-col justify-between px-5 pb-10 pt-28 sm:px-6 lg:px-8">
          <Link
            href="/listings"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-sand/80 transition hover:text-teal"
          >
            ← All listings
          </Link>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-3xl"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
              {listing.verificationStatus === "verified" ? (
                <span>Verified</span>
              ) : null}
              {listing.featured ? <span>Featured</span> : null}
              <span className="text-sand/60">{typeLabel(listing.listingType)}</span>
            </div>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {listing.title}
            </h1>
            <p className="mt-4 text-base text-sand/75 sm:text-lg">{locationLine}</p>
            <p className="mt-6 font-display text-3xl font-semibold text-sand sm:text-4xl">
              {formatPriceAmount(listing.price)}
              <span className="ml-2 text-base font-normal text-sand/60">
                / {listing.price.period}
              </span>
            </p>
          </motion.div>
        </div>
      </section>

      {images.length > 1 ? (
        <div className="bg-navy">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-4 sm:px-6 lg:px-8">
            {images.map((img, i) => {
              const video = isVideoMedia(img);
              return (
                <button
                  key={`${img.url}-${i}`}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`relative h-16 w-24 shrink-0 overflow-hidden border transition sm:h-20 sm:w-28 ${
                    activeImage === i
                      ? "border-teal opacity-100"
                      : "border-transparent opacity-60 hover:opacity-90"
                  }`}
                >
                  {video ? (
                    <video
                      src={img.url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <section className="site-section site-ambient bg-sand">
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16 lg:px-8">
          <div className="space-y-12">
            {facts.length ? (
              <div>
                <p className="site-kicker">At a glance</p>
                <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
                  {facts.map((fact) => (
                    <div key={fact.label} className="border-t border-navy/15 pt-4">
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                        {fact.label}
                      </dt>
                      <dd className="mt-2 font-display text-2xl font-semibold text-navy">
                        {fact.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            <div>
              <p className="site-kicker">About this home</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy">
                The space
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted whitespace-pre-wrap sm:text-lg">
                {listing.description || "No description provided yet."}
              </p>
            </div>

            {listing.amenities.length > 0 ? (
              <div>
                <p className="site-kicker">Included</p>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy">
                  Amenities
                </h2>
                <ul className="mt-6 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {listing.amenities.map((a) => (
                    <li
                      key={a}
                      className="border-t border-navy/10 pt-3 text-sm font-medium text-navy"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <p className="site-kicker">Where</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy">
                Location
              </h2>
              <p className="mt-4 text-base text-muted sm:text-lg">
                {locationLine}
                {listing.address.country ? `, ${listing.address.country}` : ""}
              </p>
              {listing.mapEnabled ? (
                <div className="mt-6">
                  <ListingMap
                    title={listing.title}
                    street={listing.address.street}
                    city={listing.address.city}
                    state={listing.address.state}
                    country={listing.address.country}
                    lat={listing.address.lat}
                    lng={listing.address.lng}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <aside className="lg:pt-2">
            <div className="sticky top-28 space-y-6 border-t border-navy/15 pt-6 lg:border-t-0 lg:border-l lg:border-navy/15 lg:pl-8 lg:pt-0">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Listed by
                </p>
                <p className="mt-2 font-display text-xl font-semibold text-navy">
                  {listing.ownerDisplayName || "Property owner"}
                </p>
                {listing.ownerVerified ? (
                  <p className="mt-1 text-sm text-teal-dark">Verified owner</p>
                ) : null}
              </div>

              <p className="text-sm leading-relaxed text-muted">
                You can review every detail as a guest. Sign in or create an account
                to apply for this home.
              </p>

              <div className="flex flex-col gap-3">
                <Link href={applyHref} className="site-btn site-btn-teal text-center">
                  Sign up to apply
                </Link>
                <Link href={loginHref} className="site-btn site-btn-outline text-center">
                  Sign in
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy/10 bg-sand/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-semibold text-navy">
              {formatPriceAmount(listing.price)}
            </p>
            <p className="text-xs text-muted">per {listing.price.period}</p>
          </div>
          <Link href={applyHref} className="site-btn site-btn-teal shrink-0 text-sm">
            Apply
          </Link>
        </div>
      </div>
    </div>
  );
}
