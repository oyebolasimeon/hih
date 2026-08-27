"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { useActiveProfile } from "@/hooks/useActiveProfile";

type PropertyOption = {
  listingId: string;
  title: string;
  city?: string;
  state?: string;
  role: "owner" | "tenant";
};

type ServiceRow = {
  id: string;
  listingId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  billing: string;
  active: boolean;
  listingTitle: string | null;
};

const CATEGORY_OPTIONS = [
  { value: "cleaning", label: "Cleaning" },
  { value: "security", label: "Security" },
  { value: "waste", label: "Waste" },
  { value: "generator", label: "Generator" },
  { value: "water", label: "Water" },
  { value: "internet", label: "Internet" },
  { value: "estate_dues", label: "Estate dues" },
  { value: "maintenance", label: "Maintenance package" },
  { value: "other", label: "Other" },
];

const BILLING_OPTIONS = [
  { value: "included", label: "Included in rent" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One-time" },
];

export default function ServicesClient() {
  const { isLandlordLike, isTenantLike, loading: profileLoading } =
    useActiveProfile();
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  const [listingId, setListingId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("cleaning");
  const [price, setPrice] = useState("0");
  const [billing, setBilling] = useState("monthly");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [sRes, pRes] = await Promise.all([
      fetch("/api/portal/services"),
      fetch("/api/portal/properties"),
    ]);
    const sData = await sRes.json();
    const pData = await pRes.json();
    setLoading(false);
    if (!sRes.ok) {
      setError(sData.error || "Unable to load services.");
      return;
    }
    setRows(sData.services || []);
    const props = (pData.properties || []) as PropertyOption[];
    setProperties(props);
    if (!listingId && props[0]) setListingId(props[0].listingId);
  }, [listingId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listingId,
        name,
        description: description || undefined,
        category,
        price: Number(price) || 0,
        billing,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not create service.");
      return;
    }
    setName("");
    setDescription("");
    setPrice("0");
    setMessage("Service added to property.");
    await load();
  }

  async function toggleActive(row: ServiceRow) {
    setBusyId(row.id);
    const res = await fetch(`/api/portal/services/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !row.active }),
    });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Could not update service.");
      return;
    }
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this service?")) return;
    setBusyId(id);
    const res = await fetch(`/api/portal/services/${id}`, { method: "DELETE" });
    const data = await res.json();
    setBusyId("");
    if (!res.ok) {
      setError(data.error || "Could not delete service.");
      return;
    }
    setMessage("Service removed.");
    await load();
  }

  if (loading || profileLoading) return <TableSkeleton rows={4} />;

  const propertyOptions = properties.map((p) => ({
    value: p.listingId,
    label: `${p.title}${p.city ? ` · ${p.city}` : ""}`,
  }));

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      {isLandlordLike ? (
        <form onSubmit={onCreate} className="app-card p-4 sm:p-5 space-y-4 max-w-xl">
          <h2 className="font-semibold">Add property service</h2>
          <p className="text-xs text-muted">
            Define cleaning, security, estate dues, and other services tenants
            can see on your leased properties.
          </p>
          {propertyOptions.length === 0 ? (
            <p className="text-sm text-muted">
              Create a listing first to attach services.
            </p>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Property
                </label>
                <Select
                  value={listingId}
                  onChange={setListingId}
                  options={propertyOptions}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Name</label>
                <input
                  className="app-input w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Weekly cleaning"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Category
                </label>
                <Select
                  value={category}
                  onChange={setCategory}
                  options={CATEGORY_OPTIONS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Description
                </label>
                <textarea
                  className="app-input w-full min-h-[70px]"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Price (NGN)
                  </label>
                  <input
                    className="app-input w-full"
                    type="number"
                    min={0}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Billing
                  </label>
                  <Select
                    value={billing}
                    onChange={setBilling}
                    options={BILLING_OPTIONS}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={saving}
                className="app-btn app-btn-primary text-sm"
              >
                {saving ? "Saving…" : "Add service"}
              </button>
            </>
          )}
        </form>
      ) : null}

      {isTenantLike ? (
        <p className="text-sm text-muted">
          Services offered on properties you lease. Contact your landlord for
          changes.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No services yet"
          description={
            isLandlordLike
              ? "Add cleaning, security, or estate services for your properties."
              : "Once your landlord publishes services on your leased home, they will appear here."
          }
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((s) => (
            <li key={s.id} className="app-card p-4 space-y-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {s.name}{" "}
                    <span className="text-xs text-muted capitalize">
                      · {s.category.replace("_", " ")}
                      {!s.active ? " · inactive" : ""}
                    </span>
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {s.listingTitle || "Property"} ·{" "}
                    {s.billing === "included"
                      ? "Included in rent"
                      : `${s.currency} ${s.price.toLocaleString()} / ${s.billing.replace("_", " ")}`}
                  </p>
                  {s.description ? (
                    <p className="text-sm text-muted mt-2">{s.description}</p>
                  ) : null}
                </div>
                {isLandlordLike ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      className="app-btn app-btn-secondary text-xs"
                      onClick={() => void toggleActive(s)}
                    >
                      {s.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === s.id}
                      className="app-btn app-btn-secondary text-xs"
                      onClick={() => void remove(s.id)}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
