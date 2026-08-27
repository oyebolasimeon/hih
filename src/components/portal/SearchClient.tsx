"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { FormSkeleton } from "@/components/ui/Skeleton";

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

type SortOption = "featured" | "price_asc" | "price_desc";

const TYPE_OPTIONS = [
  { value: "", label: "Any type" },
  { value: "apartment", label: "Apartment" },
  { value: "hostel", label: "Hostel" },
  { value: "house", label: "House" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

const TYPE_PILLS = [
  { value: "", label: "All" },
  { value: "apartment", label: "Apartments" },
  { value: "hostel", label: "Hostels" },
  { value: "house", label: "Houses" },
];

const POPULAR_LOCATIONS = [
  { city: "Lagos", state: "Lagos", label: "Lagos" },
  { city: "Abuja", state: "FCT", label: "Abuja" },
  { city: "Port Harcourt", state: "Rivers", label: "Port Harcourt" },
  { city: "Ibadan", state: "Oyo", label: "Ibadan" },
];

const SORT_OPTIONS = [
  { value: "featured", label: "Featured first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

function formatPrice(p: SearchListing["price"]) {
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

function listingImage(listing: SearchListing) {
  return listing.images.find((i) => i.isPrimary)?.url || listing.images[0]?.url;
}

export default function SearchClient() {
  const [listings, setListings] = useState<SearchListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<SortOption>("featured");

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

  const currentFilters = useMemo(
    () => ({ q, city, state, listingType, minPrice, maxPrice, verifiedOnly }),
    [q, city, state, listingType, minPrice, maxPrice, verifiedOnly]
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

  const sortedListings = useMemo(() => {
    const copy = [...listings];
    if (sort === "price_asc") {
      copy.sort((a, b) => a.price.amount - b.price.amount);
    } else if (sort === "price_desc") {
      copy.sort((a, b) => b.price.amount - a.price.amount);
    }
    return copy;
  }, [listings, sort]);

  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (q.trim()) {
      chips.push({ key: "q", label: `"${q.trim()}"` });
    }
    if (city.trim()) {
      chips.push({ key: "city", label: city.trim() });
    }
    if (state.trim()) {
      chips.push({ key: "state", label: state.trim() });
    }
    if (listingType) {
      chips.push({ key: "type", label: typeLabel(listingType) });
    }
    if (minPrice) {
      chips.push({
        key: "min",
        label: `Min ${formatPrice({ amount: Number(minPrice), currency: "NGN", period: "" })}`,
      });
    }
    if (maxPrice) {
      chips.push({
        key: "max",
        label: `Max ${formatPrice({ amount: Number(maxPrice), currency: "NGN", period: "" })}`,
      });
    }
    if (verifiedOnly) {
      chips.push({ key: "verified", label: "Verified only" });
    }
    return chips;
  }, [q, city, state, listingType, minPrice, maxPrice, verifiedOnly]);

  function applyFilters(next: typeof currentFilters) {
    setQ(next.q);
    setCity(next.city);
    setState(next.state);
    setListingType(next.listingType);
    setMinPrice(next.minPrice);
    setMaxPrice(next.maxPrice);
    setVerifiedOnly(next.verifiedOnly);
    void runSearch(next);
  }

  function submitSearch(overrides?: Partial<typeof currentFilters>) {
    applyFilters({ ...currentFilters, ...overrides });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submitSearch();
  }

  function clearAllFilters() {
    applyFilters({
      q: "",
      city: "",
      state: "",
      listingType: "",
      minPrice: "",
      maxPrice: "",
      verifiedOnly: false,
    });
  }

  function clearFilterKey(key: string) {
    const next = { ...currentFilters };
    if (key === "q") next.q = "";
    if (key === "city") next.city = "";
    if (key === "state") next.state = "";
    if (key === "type") next.listingType = "";
    if (key === "min") next.minPrice = "";
    if (key === "max") next.maxPrice = "";
    if (key === "verified") next.verifiedOnly = false;
    applyFilters(next);
  }

  function pickLocation(loc: (typeof POPULAR_LOCATIONS)[number]) {
    submitSearch({ city: loc.city, state: loc.state });
  }

  function pickType(type: string) {
    submitSearch({ listingType: type });
  }

  return (
    <div className="space-y-8">
      <Reveal>
        <section className="app-card overflow-hidden">
          <div className="relative px-6 py-8 sm:px-8 sm:py-10 bg-gradient-to-br from-brand/12 via-transparent to-teal/8 dark:from-brand/20 dark:to-teal/10">
            <div className="relative z-10 space-y-5 max-w-3xl">
              <div>
                <p className="site-kicker flex items-center gap-2">
                  <span className="site-live-dot" aria-hidden />
                  Find your next home
                </p>
                <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-display font-semibold tracking-tight">
                  Search verified listings
                </h1>
                <p className="mt-2 text-sm sm:text-base text-muted leading-relaxed">
                  Browse homes, hostels, and rentals across Nigeria — filter by
                  location, price, and property type.
                </p>
              </div>

              <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4">
                      <circle cx="11" cy="11" r="7" />
                      <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                    </svg>
                  </span>
                  <input
                    className="app-input w-full pl-10 bg-background/90 backdrop-blur-sm"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by title, area, or amenity…"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                    className="app-btn app-btn-secondary text-sm sm:hidden"
                  >
                    Filters
                  </button>
                  <button type="submit" className="app-btn app-btn-primary text-sm px-6">
                    Search
                  </button>
                </div>
              </form>

              <div className="flex flex-wrap gap-2">
                {POPULAR_LOCATIONS.map((loc) => {
                  const active =
                    city.toLowerCase() === loc.city.toLowerCase() &&
                    state.toLowerCase() === loc.state.toLowerCase();
                  return (
                    <button
                      key={loc.label}
                      type="button"
                      onClick={() => pickLocation(loc)}
                      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                        active
                          ? "border-brand bg-brand/10 font-semibold"
                          : "border-border/80 bg-background/60 hover:border-brand/40"
                      }`}
                    >
                      {loc.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {TYPE_PILLS.map((pill) => (
              <button
                key={pill.value || "all"}
                type="button"
                onClick={() => pickType(pill.value)}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  listingType === pill.value
                    ? "border-brand bg-brand/10 font-semibold"
                    : "border-border text-muted hover:border-brand/40 hover:text-foreground"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="hidden sm:inline-flex app-btn app-btn-secondary text-sm"
          >
            {showFilters ? "Hide filters" : "More filters"}
          </button>
        </div>

        {(showFilters || activeFilters.length > 0) && (
          <Reveal>
            <form
              onSubmit={onSubmit}
              className={`app-card p-4 sm:p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 ${
                showFilters ? "" : "hidden sm:grid"
              }`}
            >
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
                <Select
                  label="Property type"
                  value={listingType}
                  onChange={setListingType}
                  options={TYPE_OPTIONS}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Min price</label>
                  <input
                    className="app-input w-full"
                    type="number"
                    min={0}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="0"
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
                    placeholder="Any"
                  />
                </div>
              </div>
              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                  <span
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-colors ${
                      verifiedOnly
                        ? "bg-brand border-brand"
                        : "bg-surface border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={verifiedOnly}
                      onChange={(e) => setVerifiedOnly(e.target.checked)}
                    />
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${
                        verifiedOnly ? "translate-x-5" : ""
                      }`}
                    />
                  </span>
                  <span className="text-sm font-medium">Verified listings only</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {activeFilters.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="app-btn app-btn-secondary text-sm"
                    >
                      Clear all
                    </button>
                  ) : null}
                  <button type="submit" className="app-btn app-btn-primary text-sm">
                    Apply filters
                  </button>
                </div>
              </div>
            </form>
          </Reveal>
        )}

        {activeFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Active filters
            </span>
            {activeFilters.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => clearFilterKey(chip.key)}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/5 px-3 py-1 text-xs font-medium hover:bg-brand/10 transition-colors"
              >
                {chip.label}
                <span aria-hidden className="text-muted">×</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && listings.length > 0 ? (
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">
                {listings.length}
              </span>{" "}
              {listings.length === 1 ? "home" : "homes"} found
            </p>
            <div className="w-full sm:w-52">
              <Select
                value={sort}
                onChange={(v) => setSort(v as SortOption)}
                options={SORT_OPTIONS}
              />
            </div>
          </div>
        </Reveal>
      ) : null}

      {loading ? (
        <FormSkeleton />
      ) : listings.length === 0 ? (
        <EmptyState
          title="No listings found"
          description="Try broadening your filters, picking a popular city, or check back soon for new homes."
        >
          <button
            type="button"
            onClick={clearAllFilters}
            className="app-btn app-btn-primary text-sm"
          >
            Clear filters
          </button>
        </EmptyState>
      ) : (
        <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {sortedListings.map((l) => {
            const img = listingImage(l);
            return (
              <StaggerItem key={l.id}>
                <Link
                  href={`/portal/search/${l.id}`}
                  className="group app-card app-card-interactive block overflow-hidden h-full"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-surface to-surface-dark flex items-center justify-center">
                        <span className="text-xs text-muted uppercase tracking-wider">
                          No photo
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      {l.verificationStatus === "verified" ? (
                        <span className="rounded-full bg-brand/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0c0d0b]">
                          Verified
                        </span>
                      ) : null}
                      <span className="rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                        {typeLabel(l.listingType)}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="font-display text-lg font-semibold text-white line-clamp-2 drop-shadow-sm">
                        {l.title}
                      </p>
                      <p className="mt-1 text-xs text-white/85">
                        {l.address.city}, {l.address.state}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-lg font-display font-semibold text-foreground">
                        {formatPrice(l.price)}
                        <span className="text-sm font-normal text-muted">
                          {" "}
                          / {l.price.period}
                        </span>
                      </p>
                      {l.ownerVerified ? (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-brand">
                          Owner verified
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                      {l.bedrooms != null ? (
                        <span className="inline-flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3.5 w-3.5">
                            <path d="M4 12h16M4 12v6h16v-6M8 12V8h8v4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {l.bedrooms} bed
                        </span>
                      ) : null}
                      {l.bathrooms != null ? (
                        <span className="inline-flex items-center gap-1.5">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-3.5 w-3.5">
                            <path d="M6 10h12v8H6zM8 10V7a2 2 0 012-2h4a2 2 0 012 2v3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {l.bathrooms} bath
                        </span>
                      ) : null}
                      {l.ownerDisplayName ? (
                        <span className="truncate">By {l.ownerDisplayName}</span>
                      ) : null}
                    </div>

                    {l.description ? (
                      <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                        {l.description}
                      </p>
                    ) : null}

                    <span className="inline-flex items-center gap-1 text-sm font-medium text-brand-dark group-hover:underline">
                      View details
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 transition-transform group-hover:translate-x-0.5">
                        <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                      </svg>
                    </span>
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
