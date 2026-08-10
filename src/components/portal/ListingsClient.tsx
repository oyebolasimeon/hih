"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Select from "@/components/ui/Select";
import ImageFilePicker from "@/components/ui/ImageFilePicker";
import EmptyState from "@/components/ui/EmptyState";
import { FormSkeleton } from "@/components/ui/Skeleton";

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
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
].map((s) => ({ value: s, label: s }));

function formatPrice(p: ListingRow["price"]) {
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

export default function ListingsClient() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState("");

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
  const [publishNow, setPublishNow] = useState(false);

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

  async function uploadImages(files: File[]) {
    const uploaded: { url: string; publicId: string; isPrimary: boolean }[] =
      [];
    for (let i = 0; i < files.length; i++) {
      const form = new FormData();
      form.append("file", files[i]);
      const res = await fetch("/api/portal/listings/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Image upload failed.");
      }
      uploaded.push({
        url: data.url,
        publicId: data.publicId,
        isPrimary: i === 0,
      });
    }
    return uploaded;
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const images = await uploadImages(imageFiles);
      const amenities = amenitiesText
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);
      const res = await fetch("/api/portal/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingType,
          title: title.trim(),
          description: description.trim(),
          address: {
            street: street.trim(),
            city: city.trim(),
            state,
            country: "Nigeria",
          },
          price: {
            amount: Number(amount),
            currency: "NGN",
            period,
          },
          bedrooms: bedrooms ? Number(bedrooms) : undefined,
          bathrooms: bathrooms ? Number(bathrooms) : undefined,
          sizeSqm: sizeSqm ? Number(sizeSqm) : undefined,
          amenities,
          images,
          availabilityStatus: publishNow ? "available" : "draft",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create listing.");
        setSubmitting(false);
        return;
      }
      setTitle("");
      setDescription("");
      setStreet("");
      setCity("");
      setAmount("");
      setBedrooms("");
      setBathrooms("");
      setSizeSqm("");
      setAmenitiesText("");
      setImageFiles([]);
      setPublishNow(false);
      setMessage(
        publishNow
          ? "Listing submitted for verification."
          : "Draft listing saved."
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create listing.");
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
    setMessage("Listing deleted.");
    await load();
  }

  if (loading) return <FormSkeleton />;

  return (
    <div className="space-y-8">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Your listings</h2>
        {listings.length === 0 ? (
          <EmptyState
            title="No listings yet"
            description="Create your first property listing below. KYC-verified landlord or estate manager profiles only."
          />
        ) : (
          <ul className="space-y-3">
            {listings.map((l) => {
              const img =
                l.images.find((i) => i.isPrimary)?.url || l.images[0]?.url;
              return (
                <li key={l.id} className="app-card p-4 flex flex-col sm:flex-row gap-4">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt=""
                      className="h-28 w-full sm:w-36 rounded object-cover border border-border"
                    />
                  ) : (
                    <div className="h-28 w-full sm:w-36 rounded bg-surface border border-border" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-semibold truncate">{l.title}</p>
                    <p className="text-sm text-muted">
                      {l.address.city}, {l.address.state} · {l.listingType}
                    </p>
                    <p className="text-sm">{formatPrice(l.price)}</p>
                    <p className="text-xs text-muted">
                      {l.availabilityStatus} · verification: {l.verificationStatus}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-start">
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
                      className="app-btn app-btn-secondary text-xs"
                      disabled={busyId === l.id}
                      onClick={() => void remove(l.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form onSubmit={onCreate} className="app-card p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">New listing</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Type</label>
            <Select
              value={listingType}
              onChange={setListingType}
              options={TYPE_OPTIONS}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Title</label>
            <input
              className="app-input w-full"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
            required
            minLength={10}
          />
        </div>
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
          <div>
            <label className="block text-sm font-medium mb-1.5">State</label>
            <Select value={state} onChange={setState} options={NIGERIA_STATES} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Rent amount (NGN)
            </label>
            <input
              className="app-input w-full"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Period</label>
            <Select
              value={period}
              onChange={setPeriod}
              options={PERIOD_OPTIONS}
            />
          </div>
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
          <label className="block text-sm font-medium mb-1.5">
            Amenities (comma-separated)
          </label>
          <input
            className="app-input w-full"
            value={amenitiesText}
            onChange={(e) => setAmenitiesText(e.target.value)}
            placeholder="Wi‑Fi, Generator, Parking"
          />
        </div>
        <ImageFilePicker
          label="Property images"
          value={imageFiles}
          onChange={setImageFiles}
          helpText="Upload photos of the property. First image becomes the cover."
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
          />
          Submit for verification now (publish as available)
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="app-btn app-btn-primary text-sm"
        >
          {submitting ? "Saving…" : "Create listing"}
        </button>
      </form>
    </div>
  );
}
