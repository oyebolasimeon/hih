"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { FormSkeleton } from "@/components/ui/Skeleton";
import { Stagger, StaggerItem } from "@/components/motion/Motion";

type SearchListing = {
  id: string;
  listingType: string;
  title: string;
  description: string;
  address: { street: string; city: string; state: string; country: string };
  price: { amount: number; currency: string; period: string };
  images: { url: string; isPrimary?: boolean }[];
  bedrooms: number | null;
  bathrooms: number | null;
  verificationStatus: string;
  ownerVerified: boolean;
  ownerDisplayName?: string;
};

const TYPE_OPTIONS = [
  { value: "", label: "Any type" },
  { value: "apartment", label: "Apartment" },
  { value: "hostel", label: "Hostel" },
  { value: "house", label: "House" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

function formatPrice(p: SearchListing["price"]) {
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

export default function SearchClient() {
  const [listings, setListings] = useState<SearchListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [listingType, setListingType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const runSearch = useCallback(
    async (filters: {
      q: string;
      city: string;
      state: string;
      listingType: string;
      minPrice: string;
      maxPrice: string;
      verifiedOnly: boolean;
    }) => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (filters.q.trim()) params.set("q", filters.q.trim());
      if (filters.city.trim()) params.set("city", filters.city.trim());
      if (filters.state.trim()) params.set("state", filters.state.trim());
      if (filters.listingType) params.set("listingType", filters.listingType);
      if (filters.minPrice) params.set("minPrice", filters.minPrice);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
      if (filters.verifiedOnly) params.set("verifiedOnly", "1");

      const res = await fetch(`/api/portal/search?${params.toString()}`);
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Unable to search listings.");
        return;
      }
      setListings(data.listings || []);
    },
    []
  );

  useEffect(() => {
    void runSearch({
      q: "",
      city: "",
      state: "",
      listingType: "",
      minPrice: "",
      maxPrice: "",
      verifiedOnly: false,
    });
  }, [runSearch]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void runSearch({
      q,
      city,
      state,
      listingType,
      minPrice,
      maxPrice,
      verifiedOnly,
    });
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="app-card p-4 sm:p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-3"
      >
        <div>
          <label className="block text-sm font-medium mb-1.5">Keywords</label>
          <input
            className="app-input w-full"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title, amenity, street…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">City</label>
          <input
            className="app-input w-full"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Lagos"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">State</label>
          <input
            className="app-input w-full"
            value={state}
            onChange={(e) => setState(e.target.value)}
            placeholder="Lagos"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Type</label>
          <Select
            value={listingType}
            onChange={setListingType}
            options={TYPE_OPTIONS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Min price</label>
          <input
            className="app-input w-full"
            type="number"
            min={0}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Max price</label>
          <input
            className="app-input w-full"
            type="number"
            min={0}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-2">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
          />
          Verified listings only
        </label>
        <div className="flex items-end">
          <button type="submit" className="app-btn app-btn-primary text-sm w-full sm:w-auto">
            Search
          </button>
        </div>
      </form>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <FormSkeleton />
      ) : listings.length === 0 ? (
        <EmptyState
          title="No listings found"
          description="Try broadening your filters, or check back soon for new homes."
        />
      ) : (
        <Stagger className="grid sm:grid-cols-2 gap-4">
          {listings.map((l) => {
            const img =
              l.images.find((i) => i.isPrimary)?.url || l.images[0]?.url;
            return (
              <StaggerItem key={l.id}>
                <Link
                  href={`/portal/search/${l.id}`}
                  className="app-card app-card-interactive block overflow-hidden"
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-44 w-full object-cover"
                    />
                  ) : (
                    <div className="h-44 w-full bg-surface" />
                  )}
                  <div className="p-4 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold line-clamp-1">{l.title}</p>
                      {l.verificationStatus === "verified" ? (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-brand">
                          Verified
                        </span>
                      ) : null}
                      {l.ownerVerified ? (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted">
                          Owner verified
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted">
                      {l.address.city}, {l.address.state} · {l.listingType}
                    </p>
                    <p className="text-sm font-medium">{formatPrice(l.price)}</p>
                    {(l.bedrooms != null || l.bathrooms != null) && (
                      <p className="text-xs text-muted">
                        {l.bedrooms != null ? `${l.bedrooms} bed` : ""}
                        {l.bedrooms != null && l.bathrooms != null ? " · " : ""}
                        {l.bathrooms != null ? `${l.bathrooms} bath` : ""}
                      </p>
                    )}
                  </div>
                </Link>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}
