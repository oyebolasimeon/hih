"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import ReviewsClient from "@/components/portal/ReviewsClient";
import { FormSkeleton } from "@/components/ui/Skeleton";

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
  ownerVerified: boolean;
  ownerDisplayName?: string;
};

function formatPrice(p: ListingDetail["price"]) {
  try {
    return `${new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: p.currency || "NGN",
      maximumFractionDigits: 0,
    }).format(p.amount)} / ${p.period}`;
  } catch {
    return `${p.currency} ${p.amount} / ${p.period}`;
  }
}

export default function ListingDetailClient({ id }: { id: string }) {
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <FormSkeleton />;

  if (error || !listing) {
    return (
      <EmptyState
        title="Listing unavailable"
        description={error || "This listing may have been removed or is no longer available."}
      />
    );
  }

  const images = listing.images?.length
    ? listing.images
    : [{ url: "", isPrimary: true }];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/portal/search"
          className="text-sm text-brand-dark hover:underline"
        >
          ← Back to search
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">
            {listing.title}
          </h1>
          {listing.verificationStatus === "verified" ? (
            <span className="text-[11px] uppercase tracking-wider font-semibold text-brand">
              Verified listing
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted">
          {listing.address.street}, {listing.address.city}, {listing.address.state}
        </p>
        <p className="text-lg font-medium">{formatPrice(listing.price)}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {images.map((img, i) =>
          img.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${img.url}-${i}`}
              src={img.url}
              alt=""
              className="w-full aspect-[16/10] object-cover rounded-lg border border-border"
            />
          ) : null
        )}
      </div>

      <div className="app-card p-5 space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">About</h2>
          <p className="mt-2 text-sm text-muted whitespace-pre-wrap">
            {listing.description}
          </p>
        </div>
        <dl className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-muted">Type</dt>
            <dd className="capitalize">{listing.listingType.replace("_", " ")}</dd>
          </div>
          {listing.bedrooms != null ? (
            <div>
              <dt className="text-muted">Bedrooms</dt>
              <dd>{listing.bedrooms}</dd>
            </div>
          ) : null}
          {listing.bathrooms != null ? (
            <div>
              <dt className="text-muted">Bathrooms</dt>
              <dd>{listing.bathrooms}</dd>
            </div>
          ) : null}
          {listing.sizeSqm != null ? (
            <div>
              <dt className="text-muted">Size</dt>
              <dd>{listing.sizeSqm} sqm</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-muted">Owner</dt>
            <dd>
              {listing.ownerDisplayName || "Landlord"}
              {listing.ownerVerified ? " · Verified" : ""}
            </dd>
          </div>
        </dl>
        {listing.amenities?.length ? (
          <div>
            <h3 className="text-sm font-medium mb-2">Amenities</h3>
            <ul className="flex flex-wrap gap-2">
              {listing.amenities.map((a) => (
                <li
                  key={a}
                  className="text-xs border border-border rounded px-2 py-1 text-muted"
                >
                  {a}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Link
          href={`/portal/applications?listingId=${listing.id}`}
          className="app-btn app-btn-primary inline-flex text-sm"
        >
          Apply for this home
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Reviews</h2>
        <ReviewsClient listingId={listing.id} compact />
      </section>
    </div>
  );
}
