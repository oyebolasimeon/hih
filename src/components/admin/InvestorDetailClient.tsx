"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatGBP } from "@/lib/format";
import { FormSelect } from "@/components/ui/Select";
import { hasPermission } from "@/lib/rbac";
import {
  FormSkeleton,
  PageHeaderSkeleton,
  TableSkeleton,
} from "@/components/ui/Skeleton";
import ImageFilePicker from "@/components/ui/ImageFilePicker";
import { ImageGallery } from "@/components/ui/ImageViewer";

type Tab = "overview" | "properties" | "bookings" | "analytics";

type Property = {
  id: string;
  name: string;
  nickname: string;
  address: string;
  propertyType: string;
  zone: string;
  tags: string[];
  imageUrls: string[];
  status: string;
  purchasePrice: number;
  currentValue: number;
  monthlyRent: number;
};

type Booking = {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  guestName?: string;
  revenue: number;
  nightlyRate: number;
  channel: string;
  status: string;
};

type AnalyticsRow = {
  id: string;
  period: string;
  revenue: number;
  commission: number;
  occupancyRate: number;
  avgNightlyRate: number;
  revenuePAL: number;
  channelBreakdown: Record<string, number>;
};

type Investor = {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalInvested: number;
  totalReturns: number;
  portfolioValue: number;
  createdAt?: string;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "properties", label: "Properties" },
  { id: "bookings", label: "Bookings" },
  { id: "analytics", label: "Analytics" },
];

const STATUS_OPTS = [
  { value: "active", label: "active" },
  { value: "pending", label: "pending" },
  { value: "inactive", label: "inactive" },
  { value: "sold", label: "sold" },
];

export default function InvestorDetailClient({
  investorId,
}: {
  investorId: string;
}) {
  const { data: session } = useSession();
  const perms = session?.user?.permissions || [];
  const canWriteInvestor = hasPermission(perms, "investors:write");
  const canWriteProperties = hasPermission(perms, "properties:write");
  const canWriteBookings = hasPermission(perms, "bookings:write");
  const canWriteAnalytics = hasPermission(perms, "analytics:write");

  const [tab, setTab] = useState<Tab>("overview");
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [propertyImages, setPropertyImages] = useState<File[]>([]);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [editingBookingId, setEditingBookingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/investors/${investorId}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load investor.");
      return;
    }
    setInvestor(data.investor);
    setProperties(data.properties || []);
    setBookings(data.bookings || []);
    setAnalytics(data.analytics || []);
  }, [investorId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!investor) return;
    setMessage("");
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/investors/${investorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone") || "",
        totalInvested: Number(form.get("totalInvested") || 0),
        totalReturns: Number(form.get("totalReturns") || 0),
        portfolioValue: Number(form.get("portfolioValue") || 0),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save profile.");
      return;
    }
    setInvestor(data.investor);
    setMessage("Profile saved.");
  }

  async function submitProperty(
    e: FormEvent<HTMLFormElement>,
    propertyId: string | null
  ) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    propertyImages.forEach((file) => form.append("images", file));
    const url = propertyId
      ? `/api/admin/investors/${investorId}/properties/${propertyId}`
      : `/api/admin/investors/${investorId}/properties`;
    const res = await fetch(url, {
      method: propertyId ? "PATCH" : "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save property.");
      return;
    }
    formEl.reset();
    setPropertyImages([]);
    setEditingPropertyId(null);
    setMessage(propertyId ? "Property updated." : "Property assigned.");
    await load();
  }

  async function deleteProperty(propertyId: string) {
    if (!confirm("Delete this property and its bookings?")) return;
    const res = await fetch(
      `/api/admin/investors/${investorId}/properties/${propertyId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete property.");
      return;
    }
    setMessage("Property deleted.");
    await load();
  }

  async function submitBooking(
    e: FormEvent<HTMLFormElement>,
    bookingId: string | null
  ) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const payload = {
      propertyId: form.get("propertyId"),
      startDate: form.get("startDate"),
      endDate: form.get("endDate"),
      guestName: form.get("guestName") || undefined,
      revenue: Number(form.get("revenue") || 0),
      nightlyRate: Number(form.get("nightlyRate") || 0),
      channel: form.get("channel"),
      status: form.get("status"),
    };
    const url = bookingId
      ? `/api/admin/investors/${investorId}/bookings/${bookingId}`
      : `/api/admin/investors/${investorId}/bookings`;
    const res = await fetch(url, {
      method: bookingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save booking.");
      return;
    }
    formEl.reset();
    setEditingBookingId(null);
    setMessage(bookingId ? "Booking updated." : "Booking added.");
    await load();
  }

  async function deleteBooking(bookingId: string) {
    if (!confirm("Delete this booking?")) return;
    const res = await fetch(
      `/api/admin/investors/${investorId}/bookings/${bookingId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete booking.");
      return;
    }
    setMessage("Booking deleted.");
    await load();
  }

  async function saveAnalytics(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const breakdownRaw = String(form.get("channelBreakdown") || "").trim();
    let channelBreakdown: Record<string, number> = {};
    if (breakdownRaw) {
      try {
        channelBreakdown = JSON.parse(breakdownRaw);
      } catch {
        setError('Channel breakdown must be JSON, e.g. {"airbnb":1000,"direct":500}');
        return;
      }
    }

    const res = await fetch(`/api/admin/investors/${investorId}/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        period: form.get("period"),
        revenue: Number(form.get("revenue") || 0),
        commission: Number(form.get("commission") || 0),
        occupancyRate: Number(form.get("occupancyRate") || 0),
        avgNightlyRate: Number(form.get("avgNightlyRate") || 0),
        revenuePAL: Number(form.get("revenuePAL") || 0),
        channelBreakdown,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to save analytics.");
      return;
    }
    formEl.reset();
    setMessage("Analytics period saved.");
    await load();
  }

  async function deleteAnalytics(analyticsId: string) {
    if (!confirm("Delete this analytics period?")) return;
    const res = await fetch(
      `/api/admin/investors/${investorId}/analytics/${analyticsId}`,
      { method: "DELETE" }
    );
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete analytics.");
      return;
    }
    setMessage("Analytics deleted.");
    await load();
  }

  function propertyFormFields(p?: Property | null) {
    return (
      <>
        <div>
          <label className="block text-sm font-medium mb-1.5">Name / title</label>
          <input name="name" required className="app-input" defaultValue={p?.name} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Nickname</label>
          <input
            name="nickname"
            className="app-input"
            defaultValue={p?.nickname}
            placeholder="Short display name"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium mb-1.5">Address</label>
          <input
            name="address"
            required
            className="app-input"
            defaultValue={p?.address}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Type</label>
          <input
            name="propertyType"
            className="app-input"
            defaultValue={p?.propertyType}
            placeholder="apartment, house…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Zone</label>
          <input
            name="zone"
            className="app-input"
            defaultValue={p?.zone}
            placeholder="Zone 2, Canary Wharf…"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Tags (comma-separated)</label>
          <input
            name="tags"
            className="app-input"
            defaultValue={(p?.tags || []).join(", ")}
          />
        </div>
        <div>
          <FormSelect
            name="status"
            label="Status"
            defaultValue={p?.status || "active"}
            options={STATUS_OPTS}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Purchase price</label>
          <input
            name="purchasePrice"
            type="number"
            min={0}
            defaultValue={p?.purchasePrice ?? 0}
            className="app-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Current value</label>
          <input
            name="currentValue"
            type="number"
            min={0}
            defaultValue={p?.currentValue ?? 0}
            className="app-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Monthly rent</label>
          <input
            name="monthlyRent"
            type="number"
            min={0}
            defaultValue={p?.monthlyRent ?? 0}
            className="app-input"
          />
        </div>
        <div className="sm:col-span-2">
          <ImageFilePicker
            value={propertyImages}
            onChange={setPropertyImages}
            disabled={!canWriteProperties}
          />
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <FormSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (!investor) {
    return (
      <div>
        <p className="text-danger">{error || "Investor not found."}</p>
        <Link
          href="/admin"
          className="text-sm text-brand-dark hover:underline mt-2 inline-block"
        >
          Back to investors
        </Link>
      </div>
    );
  }

  const editingProperty = properties.find((p) => p.id === editingPropertyId);
  const editingBooking = bookings.find((b) => b.id === editingBookingId);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          ← Investors
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-display font-semibold">
          {investor.name}
        </h1>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <p className="text-sm text-muted">{investor.email}</p>
          {investor.createdAt ? (
            <p className="text-xs text-muted">
              Joined {String(investor.createdAt).slice(0, 10)}
            </p>
          ) : null}
          <Link
            href={`/admin/audit?investorId=${investorId}`}
            className="text-xs font-medium text-brand hover:underline"
          >
            View audit trail
          </Link>
          {canWriteInvestor ? (
            <button
              type="button"
              className="app-btn app-btn-secondary text-xs w-fit"
              onClick={async () => {
                setError("");
                setMessage("");
                const res = await fetch(
                  `/api/admin/investors/${investorId}/notify`,
                  { method: "POST" }
                );
                const data = await res.json();
                if (!res.ok) {
                  setError(data.error || "Unable to send email.");
                  return;
                }
                setMessage(data.message || "Email sent.");
              }}
            >
              Send portfolio update email
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-foreground" role="status">
          {message}
        </p>
      ) : null}

      <div
        className="inline-flex flex-wrap rounded-md border border-border p-0.5 bg-surface gap-0.5"
        role="tablist"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded ${
              tab === t.id
                ? "bg-brand text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <section className="app-card p-5">
          <h2 className="font-semibold mb-4">Profile & totals</h2>
          <form onSubmit={saveProfile} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <input
                name="name"
                defaultValue={investor.name}
                required
                className="app-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Phone</label>
              <input
                name="phone"
                defaultValue={investor.phone || ""}
                className="app-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Total invested
              </label>
              <input
                name="totalInvested"
                type="number"
                min={0}
                step="1"
                defaultValue={investor.totalInvested}
                className="app-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Total returns
              </label>
              <input
                name="totalReturns"
                type="number"
                min={0}
                step="1"
                defaultValue={investor.totalReturns}
                className="app-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Portfolio value
              </label>
              <input
                name="portfolioValue"
                type="number"
                min={0}
                step="1"
                defaultValue={investor.portfolioValue}
                className="app-input"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="app-btn app-btn-primary"
                disabled={!canWriteInvestor}
              >
                Save profile
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {tab === "properties" ? (
        <section className="space-y-4">
          <p className="text-sm text-muted">
            Assign outright Nova holdings. Investors cannot create properties.
          </p>
          <div className="app-card p-5">
            <h3 className="font-medium mb-3">
              {editingPropertyId ? "Edit property" : "Assign property"}
            </h3>
            <form
              key={editingPropertyId || "new-property"}
              onSubmit={(e) => submitProperty(e, editingPropertyId)}
              className="grid sm:grid-cols-2 gap-4"
            >
              {propertyFormFields(editingProperty)}
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="app-btn app-btn-primary"
                  disabled={!canWriteProperties}
                >
                  {editingPropertyId ? "Save changes" : "Assign Nova property"}
                </button>
                {editingPropertyId ? (
                  <button
                    type="button"
                    className="app-btn app-btn-secondary"
                    onClick={() => {
                      setEditingPropertyId(null);
                      setPropertyImages([]);
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="space-y-3">
            {properties.map((p) => (
              <div key={p.id} className="app-card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {p.nickname || p.name}
                      {p.nickname ? (
                        <span className="text-muted font-normal text-sm">
                          {" "}
                          · {p.name}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted">{p.address}</p>
                    <p className="text-xs text-muted mt-1">
                      {p.status}
                      {p.propertyType ? ` · ${p.propertyType}` : ""}
                      {p.zone ? ` · ${p.zone}` : ""}
                      {" · "}
                      {formatGBP(p.currentValue)}
                      {p.monthlyRent
                        ? ` · rent ${formatGBP(p.monthlyRent)}/mo`
                        : ""}
                      {" · "}
                      {p.imageUrls.length} image(s)
                    </p>
                    {p.tags?.length ? (
                      <p className="text-xs text-muted mt-1">
                        {p.tags.join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPropertyId(p.id);
                        setPropertyImages([]);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="app-btn app-btn-secondary text-xs"
                      disabled={!canWriteProperties}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteProperty(p.id)}
                      className="app-btn app-btn-danger text-xs"
                      disabled={!canWriteProperties}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                {p.imageUrls.length ? (
                  <ImageGallery images={p.imageUrls} title={p.name} />
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {tab === "bookings" ? (
        <section className="space-y-4">
          <p className="text-sm text-muted">
            Record stays Nova operated — lease, short let, Airbnb, Booking.com,
            or direct.
          </p>
          <div className="app-card p-5">
            <h3 className="font-medium mb-3">
              {editingBookingId ? "Edit booking" : "Add booking"}
            </h3>
            <form
              key={editingBookingId || "new-booking"}
              onSubmit={(e) => submitBooking(e, editingBookingId)}
              className="grid sm:grid-cols-2 gap-4"
            >
              <div className="sm:col-span-2">
                <FormSelect
                  name="propertyId"
                  label="Property"
                  required
                  defaultValue={editingBooking?.propertyId || ""}
                  placeholder="Select property"
                  options={[
                    { value: "", label: "Select property", disabled: true },
                    ...properties.map((p) => ({
                      value: p.id,
                      label: p.nickname || p.name,
                    })),
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Start</label>
                <input
                  name="startDate"
                  type="date"
                  required
                  className="app-input"
                  defaultValue={
                    editingBooking
                      ? String(editingBooking.startDate).slice(0, 10)
                      : undefined
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">End</label>
                <input
                  name="endDate"
                  type="date"
                  required
                  className="app-input"
                  defaultValue={
                    editingBooking
                      ? String(editingBooking.endDate).slice(0, 10)
                      : undefined
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Guest</label>
                <input
                  name="guestName"
                  className="app-input"
                  defaultValue={editingBooking?.guestName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Revenue</label>
                <input
                  name="revenue"
                  type="number"
                  min={0}
                  defaultValue={editingBooking?.revenue ?? 0}
                  className="app-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Nightly rate
                </label>
                <input
                  name="nightlyRate"
                  type="number"
                  min={0}
                  defaultValue={editingBooking?.nightlyRate ?? 0}
                  className="app-input"
                />
              </div>
              <div>
                <FormSelect
                  name="channel"
                  label="Channel"
                  defaultValue={editingBooking?.channel || "direct"}
                  options={[
                    { value: "direct", label: "direct" },
                    { value: "airbnb", label: "airbnb" },
                    { value: "booking.com", label: "booking.com" },
                    { value: "other", label: "other" },
                  ]}
                />
              </div>
              <div>
                <FormSelect
                  name="status"
                  label="Status"
                  defaultValue={editingBooking?.status || "confirmed"}
                  options={[
                    { value: "confirmed", label: "confirmed" },
                    { value: "pending", label: "pending" },
                    { value: "cancelled", label: "cancelled" },
                  ]}
                />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="app-btn app-btn-primary"
                  disabled={!properties.length || !canWriteBookings}
                >
                  {editingBookingId ? "Save booking" : "Add booking"}
                </button>
                {editingBookingId ? (
                  <button
                    type="button"
                    className="app-btn app-btn-secondary"
                    onClick={() => setEditingBookingId(null)}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </div>

          <div className="app-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Revenue</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      {properties.find((p) => p.id === b.propertyId)?.name ||
                        b.propertyId}
                    </td>
                    <td className="px-4 py-3">{b.guestName || "—"}</td>
                    <td className="px-4 py-3">
                      {String(b.startDate).slice(0, 10)} →{" "}
                      {String(b.endDate).slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">{b.channel}</td>
                    <td className="px-4 py-3">{b.status}</td>
                    <td className="px-4 py-3">{formatGBP(b.revenue)}</td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBookingId(b.id);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        className="text-xs font-medium text-brand-dark"
                        disabled={!canWriteBookings}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteBooking(b.id)}
                        className="text-danger text-xs font-medium"
                        disabled={!canWriteBookings}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "analytics" ? (
        <section className="space-y-4">
          <p className="text-sm text-muted">
            Monthly summary investors see for Nova-managed performance.
          </p>
          <div className="app-card p-5">
            <form onSubmit={saveAnalytics} className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Period (YYYY-MM)
                </label>
                <input
                  name="period"
                  required
                  placeholder="2026-07"
                  className="app-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Occupancy %
                </label>
                <input
                  name="occupancyRate"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  defaultValue={0}
                  className="app-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Revenue</label>
                <input
                  name="revenue"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="app-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Commission
                </label>
                <input
                  name="commission"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="app-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Avg nightly rate
                </label>
                <input
                  name="avgNightlyRate"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="app-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Revenue PAL
                </label>
                <input
                  name="revenuePAL"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="app-input"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1.5">
                  Channel breakdown (JSON)
                </label>
                <input
                  name="channelBreakdown"
                  className="app-input"
                  placeholder='{"airbnb":1200,"direct":400}'
                />
              </div>
              <div>
                <button
                  type="submit"
                  className="app-btn app-btn-primary"
                  disabled={!canWriteAnalytics}
                >
                  Save period
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-2">
            {analytics.map((a) => (
              <div
                key={a.id}
                className="app-card p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="font-medium">{a.period}</p>
                  <p className="text-xs text-muted">
                    Rev {formatGBP(a.revenue)} · Comm {formatGBP(a.commission)} ·
                    Occ {a.occupancyRate}% · Avg night{" "}
                    {formatGBP(a.avgNightlyRate || 0)} · PAL{" "}
                    {formatGBP(a.revenuePAL || 0)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteAnalytics(a.id)}
                  className="app-btn app-btn-danger text-xs"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
