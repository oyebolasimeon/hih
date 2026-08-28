"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import Select from "@/components/ui/Select";
import ImageFilePicker from "@/components/ui/ImageFilePicker";
import EmptyState from "@/components/ui/EmptyState";
import { FormSkeleton, StatCardsSkeleton } from "@/components/ui/Skeleton";
import RequireProfileTypes from "@/components/portal/RequireProfileTypes";

type ListingRow = {
  id: string;
  listingType: string;
  title: string;
  description: string;
  address: { street: string; city: string; state: string; country: string };
  price: { amount: number; currency: string; period: string };
  amenities: string[];
  images: { url: string; publicId?: string; isPrimary?: boolean }[];
  bedrooms: number | null;
  bathrooms: number | null;
  sizeSqm: number | null;
  availabilityStatus: string;
  verificationStatus: string;
};

type FilterTab = "all" | "draft" | "available" | "pending" | "occupied";

const TYPE_OPTIONS = [
  { value: "apartment", label: "Apartment" },
  { value: "hostel", label: "Hostel" },
  { value: "house", label: "House" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

const PERIOD_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "term", label: "Per term" },
];

const NIGERIA_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
].map((s) => ({ value: s, label: s }));

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "available", label: "Live" },
  { id: "pending", label: "In review" },
  { id: "occupied", label: "Occupied" },
];

function formatPrice(p: ListingRow["price"]) {
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
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function listingImage(l: ListingRow) {
  return l.images.find((i) => i.isPrimary)?.url || l.images[0]?.url;
}

function availabilityClass(status: string) {
  if (status === "available") return "bg-teal/15 text-brand-dark border-teal/30";
  if (status === "draft") return "bg-surface text-muted border-border";
  if (status === "occupied") return "bg-brand/10 text-brand-dark border-brand/25";
  return "bg-brand/10 text-brand-dark border-brand/25";
}

function verificationClass(status: string) {
  if (status === "verified") return "bg-teal/15 text-brand-dark border-teal/30";
  if (status === "rejected") return "bg-danger/10 text-danger border-danger/30";
  if (status === "pending") return "bg-brand/10 text-brand-dark border-brand/25";
  return "bg-surface text-muted border-border";
}

function matchesFilter(l: ListingRow, tab: FilterTab) {
  if (tab === "all") return true;
  if (tab === "pending") {
    return l.verificationStatus === "pending" || l.availabilityStatus === "pending";
  }
  return l.availabilityStatus === tab;
}

function ListingsManager() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");

  const [listingType, setListingType] = useState("apartment");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Lagos");
  const [amount, setAmount] = useState("");
  const [period, setPeriod] = useState("yearly");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [sizeSqm, setSizeSqm] = useState("");
  const [amenitiesText, setAmenitiesText] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<ListingRow["images"]>([]);
  const [publishNow, setPublishNow] = useState(false);
  const [legalProvider, setLegalProvider] = useState<"hih" | "own_legal">("hih");
  const [legalCompanyName, setLegalCompanyName] = useState("");
  const [agreementFeePercent, setAgreementFeePercent] = useState("");

  const resetForm = useCallback(() => {
    setEditingId(null);
    setListingType("apartment");
    setTitle("");
    setDescription("");
    setStreet("");
    setCity("");
    setState("Lagos");
    setAmount("");
    setPeriod("yearly");
    setBedrooms("");
    setBathrooms("");
    setSizeSqm("");
    setAmenitiesText("");
    setImageFiles([]);
    setExistingImages([]);
    setPublishNow(false);
    setLegalProvider("hih");
    setLegalCompanyName("");
    setAgreementFeePercent("");
    setShowCreate(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/listings");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load listings.");
      return;
    }
    setListings(data.listings || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    const draft = listings.filter((l) => l.availabilityStatus === "draft").length;
    const live = listings.filter((l) => l.availabilityStatus === "available").length;
    const inReview = listings.filter(
      (l) =>
        l.verificationStatus === "pending" ||
        l.availabilityStatus === "pending"
    ).length;
    const occupied = listings.filter((l) => l.availabilityStatus === "occupied").length;
    return { total: listings.length, draft, live, inReview, occupied };
  }, [listings]);

  const filteredListings = useMemo(
    () => listings.filter((l) => matchesFilter(l, filter)),
    [listings, filter]
  );

  function startEdit(l: ListingRow) {
    setEditingId(l.id);
    setShowCreate(true);
    setListingType(l.listingType);
    setTitle(l.title);
    setDescription(l.description);
    setStreet(l.address.street);
    setCity(l.address.city);
    setState(l.address.state || "Lagos");
    setAmount(String(l.price.amount));
    setPeriod(l.price.period);
    setBedrooms(l.bedrooms != null ? String(l.bedrooms) : "");
    setBathrooms(l.bathrooms != null ? String(l.bathrooms) : "");
    setSizeSqm(l.sizeSqm != null ? String(l.sizeSqm) : "");
    setAmenitiesText((l.amenities || []).join(", "));
    setExistingImages(l.images || []);
    setImageFiles([]);
    setPublishNow(false);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadImages(files: File[]) {
    const uploaded: { url: string; publicId: string; isPrimary: boolean }[] = [];
    for (let i = 0; i < files.length; i++) {
      const form = new FormData();
      form.append("file", files[i]);
      const res = await fetch("/api/portal/listings/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Image upload failed.");
      uploaded.push({ url: data.url, publicId: data.publicId, isPrimary: false });
    }
    return uploaded;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const newImages = await uploadImages(imageFiles);
      const images = [
        ...existingImages.map((img, i) => ({
          url: img.url,
          publicId: img.publicId || "",
          isPrimary: img.isPrimary ?? i === 0,
        })),
        ...newImages,
      ].map((img, i) => ({ ...img, isPrimary: i === 0 }));

      const amenities = amenitiesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

      const payload = {
        listingType,
        title: title.trim(),
        description: description.trim(),
        address: {
          street: street.trim(),
          city: city.trim(),
          state,
          country: "Nigeria",
        },
        price: { amount: Number(amount), currency: "NGN", period },
        bedrooms: bedrooms ? Number(bedrooms) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        sizeSqm: sizeSqm ? Number(sizeSqm) : null,
        amenities,
        images,
        legalSettings: {
          provider: legalProvider,
          ...(legalProvider === "own_legal" && legalCompanyName.trim()
            ? { companyName: legalCompanyName.trim() }
            : {}),
          ...(agreementFeePercent
            ? { agreementFeePercent: Number(agreementFeePercent) }
            : {}),
        },
        ...(editingId
          ? publishNow
            ? { availabilityStatus: "available" as const }
            : {}
          : {
              availabilityStatus: publishNow
                ? ("available" as const)
                : ("draft" as const),
            }),
      };

      const res = await fetch(
        editingId ? `/api/portal/listings/${editingId}` : "/api/portal/listings",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not save listing.");
        setSubmitting(false);
        return;
      }
      setMessage(
        editingId
          ? publishNow
            ? "Listing updated and submitted for verification."
            : "Listing updated."
          : publishNow
            ? "Listing submitted for verification."
            : "Draft listing saved."
      );
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save listing.");
    }
    setSubmitting(false);
  }

  async function publish(id: string) {
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/portal/listings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availabilityStatus: "available" }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Could not publish listing.");
      return;
    }
    setMessage("Listing submitted for verification.");
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this listing?")) return;
    setBusyId(id);
    setError("");
    const res = await fetch(`/api/portal/listings/${id}`, { method: "DELETE" });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Could not delete listing.");
      return;
    }
    if (editingId === id) resetForm();
    setMessage("Listing deleted.");
    await load();
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">
            My listings
          </h1>
          <p className="mt-1 text-sm text-muted max-w-2xl">
            Create and manage property listings for tenants to discover and apply.
          </p>
        </div>
        <StatCardsSkeleton count={4} />
        <FormSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          My listings
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Create and manage property listings for tenants to discover and apply.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-danger rounded-md border border-danger/20 bg-danger/5 px-3 py-2" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-brand-dark rounded-md border border-brand/20 bg-brand/5 px-3 py-2">
          {message}
        </p>
      ) : null}

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Reveal>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total</p>
            <p className="mt-2 text-2xl font-display font-semibold">{stats.total}</p>
          </div>
        </Reveal>
        <Reveal delay={0.04}>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Live</p>
            <p className="mt-2 text-2xl font-display font-semibold">{stats.live}</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Drafts</p>
            <p className="mt-2 text-2xl font-display font-semibold">{stats.draft}</p>
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">In review</p>
            <p className="mt-2 text-2xl font-display font-semibold">{stats.inReview}</p>
          </div>
        </Reveal>
      </section>

      <section className="space-y-3">
        <Reveal>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">Your properties</h2>
              <p className="text-sm text-muted">
                {filteredListings.length} listing{filteredListings.length === 1 ? "" : "s"}
                {filter !== "all" ? ` · ${FILTER_TABS.find((t) => t.id === filter)?.label}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (showCreate && !editingId) {
                  setShowCreate(false);
                } else {
                  resetForm();
                  setShowCreate(true);
                }
              }}
              className="app-btn app-btn-primary text-sm"
            >
              {showCreate && !editingId ? "Cancel" : "New listing"}
            </button>
          </div>
        </Reveal>

        <Reveal delay={0.04}>
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  filter === tab.id
                    ? "border-brand bg-brand/10 font-semibold"
                    : "border-border text-muted hover:border-brand/40"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Reveal>
      </section>

      {showCreate ? (
        <Reveal>
          <form onSubmit={onSubmit} className="app-card overflow-hidden">
            <div className="px-5 py-6 sm:px-6 border-b border-border/60 bg-gradient-to-br from-brand/10 to-transparent">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    {editingId ? "Edit listing" : "Create a listing"}
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    Add photos, pricing, and location. Save as draft or submit for verification.
                  </p>
                </div>
                {editingId ? (
                  <button
                    type="button"
                    className="app-btn app-btn-secondary text-xs"
                    onClick={resetForm}
                  >
                    Cancel edit
                  </button>
                ) : null}
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              <div className="space-y-4">
                <p className="text-sm font-semibold">Basics</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Select
                    label="Property type"
                    value={listingType}
                    onChange={setListingType}
                    options={TYPE_OPTIONS}
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Title</label>
                    <input
                      className="app-input w-full"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. 2-bed flat in Lekki"
                      required
                      minLength={3}
                      maxLength={160}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Description</label>
                  <textarea
                    className="app-input w-full min-h-[120px]"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the property, neighbourhood, and what's included."
                    required
                    minLength={10}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-border/60 p-4 bg-surface/40">
                <p className="text-sm font-semibold">Location</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Street</label>
                    <input
                      className="app-input w-full"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">City</label>
                    <input
                      className="app-input w-full"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>
                  <Select
                    label="State"
                    value={state}
                    onChange={setState}
                    options={NIGERIA_STATES}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-border/60 p-4 bg-surface/40">
                <p className="text-sm font-semibold">Pricing & details</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Rent (NGN)</label>
                    <input
                      className="app-input w-full"
                      type="number"
                      min={1}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                  <Select
                    label="Billing period"
                    value={period}
                    onChange={setPeriod}
                    options={PERIOD_OPTIONS}
                  />
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Bedrooms</label>
                    <input
                      className="app-input w-full"
                      type="number"
                      min={0}
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Bathrooms</label>
                    <input
                      className="app-input w-full"
                      type="number"
                      min={0}
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Size (sqm)</label>
                    <input
                      className="app-input w-full"
                      type="number"
                      min={1}
                      value={sizeSqm}
                      onChange={(e) => setSizeSqm(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Amenities</label>
                  <input
                    className="app-input w-full"
                    value={amenitiesText}
                    onChange={(e) => setAmenitiesText(e.target.value)}
                    placeholder="Wi‑Fi, Generator, Parking"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-sm font-semibold">Photos</p>
                {existingImages.length ? (
                  <div className="flex flex-wrap gap-2">
                    {existingImages.map((img) => (
                      <div key={img.url} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.url}
                          alt=""
                          className="h-24 w-32 rounded-lg object-cover border border-border"
                        />
                        <button
                          type="button"
                          className="absolute -top-1.5 -right-1.5 rounded-full bg-navy text-sand text-[10px] px-2 py-0.5 shadow"
                          onClick={() =>
                            setExistingImages((prev) =>
                              prev.filter((i) => i.url !== img.url)
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                <ImageFilePicker
                  label={editingId ? "Add more photos" : "Property photos"}
                  value={imageFiles}
                  onChange={setImageFiles}
                  helpText="First photo becomes the cover image."
                />
              </div>

              <div className="space-y-4 rounded-lg border border-border/60 p-4 bg-surface/40">
                <p className="text-sm font-semibold">Legal & agreement handling</p>
                <Select
                  label="Who handles the tenancy agreement?"
                  value={legalProvider}
                  onChange={(v) => setLegalProvider(v as "hih" | "own_legal")}
                  options={[
                    { value: "hih", label: "House In Hand handles legal" },
                    { value: "own_legal", label: "My own legal company" },
                  ]}
                />
                {legalProvider === "own_legal" ? (
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Legal company name
                    </label>
                    <input
                      className="app-input w-full"
                      value={legalCompanyName}
                      onChange={(e) => setLegalCompanyName(e.target.value)}
                      placeholder="e.g. Smith & Partners Legal"
                      required
                    />
                    <p className="text-xs text-muted mt-1">
                      Tenants pay the agreement fee to you. House In Hand charges a
                      platform fee (min 1%) on rent.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    Tenants pay the agreement fee to House In Hand. We prepare and
                    manage all legal documents.
                  </p>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Agreement fee (% of rent, optional override)
                  </label>
                  <input
                    className="app-input w-full"
                    type="number"
                    min={0}
                    max={100}
                    value={agreementFeePercent}
                    onChange={(e) => setAgreementFeePercent(e.target.value)}
                    placeholder="Default set by admin (10%)"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={publishNow}
                  onChange={(e) => setPublishNow(e.target.checked)}
                />
                <span>
                  <span className="font-medium block">
                    Submit for verification
                  </span>
                  <span className="text-muted text-xs">
                    {editingId
                      ? "Mark as available and send for admin review."
                      : "Publish now instead of saving as a draft."}
                  </span>
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="app-btn app-btn-primary text-sm"
              >
                {submitting
                  ? "Saving…"
                  : editingId
                    ? "Update listing"
                    : "Create listing"}
              </button>
            </div>
          </form>
        </Reveal>
      ) : null}

      {filteredListings.length === 0 ? (
        <EmptyState
          title={listings.length === 0 ? "No listings yet" : "No listings in this filter"}
          description={
            listings.length === 0
              ? "Create your first property listing to start receiving applications."
              : "Try a different filter or create a new listing."
          }
        >
          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="app-btn app-btn-primary text-sm"
            >
              New listing
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <Stagger className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredListings.map((l) => {
            const img = listingImage(l);
            return (
              <StaggerItem key={l.id}>
                <article className="app-card overflow-hidden flex flex-col h-full">
                  <div className="relative aspect-[4/3] overflow-hidden bg-surface">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-surface to-surface-dark">
                        <span className="text-xs text-muted uppercase tracking-wider">
                          No photo
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${availabilityClass(l.availabilityStatus)}`}
                      >
                        {l.availabilityStatus}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${verificationClass(l.verificationStatus)}`}
                      >
                        {l.verificationStatus}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="font-display text-lg font-semibold text-white line-clamp-2">
                        {l.title}
                      </p>
                      <p className="mt-1 text-xs text-white/85">
                        {l.address.city}, {l.address.state} · {typeLabel(l.listingType)}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col flex-1 gap-3">
                    <div>
                      <p className="text-lg font-display font-semibold">
                        {formatPrice(l.price)}
                        <span className="text-sm font-normal text-muted">
                          {" "}/ {l.price.period}
                        </span>
                      </p>
                      {(l.bedrooms != null || l.bathrooms != null) && (
                        <p className="text-xs text-muted mt-1">
                          {l.bedrooms != null ? `${l.bedrooms} bed` : ""}
                          {l.bedrooms != null && l.bathrooms != null ? " · " : ""}
                          {l.bathrooms != null ? `${l.bathrooms} bath` : ""}
                          {l.sizeSqm ? ` · ${l.sizeSqm} sqm` : ""}
                        </p>
                      )}
                    </div>

                    <div className="mt-auto flex flex-wrap gap-2">
                      <Link
                        href={`/portal/search/${l.id}`}
                        className="app-btn app-btn-secondary text-xs"
                      >
                        Preview
                      </Link>
                      <button
                        type="button"
                        className="app-btn app-btn-secondary text-xs"
                        disabled={busyId === l.id}
                        onClick={() => startEdit(l)}
                      >
                        Edit
                      </button>
                      {l.availabilityStatus === "draft" ? (
                        <button
                          type="button"
                          className="app-btn app-btn-primary text-xs"
                          disabled={busyId === l.id}
                          onClick={() => void publish(l.id)}
                        >
                          Publish
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="app-btn app-btn-secondary text-xs text-danger"
                        disabled={busyId === l.id}
                        onClick={() => void remove(l.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}
    </div>
  );
}

export default function ListingsClient() {
  return (
    <RequireProfileTypes
      types={["landlord", "estate_manager"]}
      title="Listings are for landlords"
      description="Switch to a landlord or estate manager profile to create and manage property listings."
    >
      <ListingsManager />
    </RequireProfileTypes>
  );
}
