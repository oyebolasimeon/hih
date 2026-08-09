"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { formatGBP } from "@/lib/format";
import { FormSelect } from "@/components/ui/Select";
import { hasPermission } from "@/lib/rbac";
import { FormSkeleton, PageHeaderSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

type Property = {
  id: string;
  name: string;
  address: string;
  imageUrls: string[];
  status: string;
  purchasePrice: number;
  currentValue: number;
};

type Booking = {
  id: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  guestName?: string;
  revenue: number;
  channel: string;
  status: string;
};

type AnalyticsRow = {
  id: string;
  period: string;
  revenue: number;
  commission: number;
  occupancyRate: number;
  channelBreakdown: Record<string, number>;
};

type Investor = {
  id: string;
  name: string;
  email: string;
  totalInvested: number;
  totalReturns: number;
  portfolioValue: number;
};

export default function InvestorDetailClient({ investorId }: { investorId: string }) {
  const { data: session } = useSession();
  const perms = session?.user?.permissions || [];
  const canWriteInvestor = hasPermission(perms, "investors:write");
  const canWriteProperties = hasPermission(perms, "properties:write");
  const canWriteBookings = hasPermission(perms, "bookings:write");
  const canWriteAnalytics = hasPermission(perms, "analytics:write");

  const [investor, setInvestor] = useState<Investor | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
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

  async function addProperty(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const res = await fetch(`/api/admin/investors/${investorId}/properties`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to add property.");
      return;
    }
    formEl.reset();
    setMessage("Property added.");
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

  async function addBooking(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const res = await fetch(`/api/admin/investors/${investorId}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: form.get("propertyId"),
        startDate: form.get("startDate"),
        endDate: form.get("endDate"),
        guestName: form.get("guestName") || undefined,
        revenue: Number(form.get("revenue") || 0),
        channel: form.get("channel"),
        status: form.get("status"),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to add booking.");
      return;
    }
    formEl.reset();
    setMessage("Booking added.");
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
        <Link href="/admin" className="text-sm text-brand-dark hover:underline mt-2 inline-block">
          Back to investors
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-foreground">
          ← Investors
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-display font-semibold">
          {investor.name}
        </h1>
        <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <p className="text-sm text-muted">{investor.email}</p>
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

      <section className="app-card p-5">
        <h2 className="font-semibold mb-4">Profile & totals</h2>
        <form onSubmit={saveProfile} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input name="name" defaultValue={investor.name} required className="app-input" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Total invested</label>
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
            <label className="block text-sm font-medium mb-1.5">Total returns</label>
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
            <label className="block text-sm font-medium mb-1.5">Portfolio value</label>
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
            {!canWriteInvestor ? (
              <p className="mt-2 text-xs text-muted">Read-only: you lack investors:write.</p>
            ) : null}
          </div>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Properties from Nova</h2>
        <p className="text-sm text-muted -mt-2 mb-2">
          Investors cannot create properties. Assign an outright Nova holding —
          Nova can then manage lease, rent, or Airbnb operations and post returns
          the investor sees in their portal. They can also express interest on
          Opportunities listings.
        </p>
        <div className="app-card p-5">
          <form onSubmit={addProperty} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <input name="name" required className="app-input" />
            </div>
            <div>
              <FormSelect
                name="status"
                label="Status"
                defaultValue="active"
                options={[
                  { value: "active", label: "active" },
                  { value: "inactive", label: "inactive" },
                  { value: "sold", label: "sold" },
                ]}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Address</label>
              <input name="address" required className="app-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Purchase price</label>
              <input name="purchasePrice" type="number" min={0} defaultValue={0} className="app-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Current value</label>
              <input name="currentValue" type="number" min={0} defaultValue={0} className="app-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Images</label>
              <input name="images" type="file" accept="image/*" multiple className="app-input" />
            </div>
            <div>
              <button
                type="submit"
                className="app-btn app-btn-primary"
                disabled={!canWriteProperties}
              >
                Assign Nova property
              </button>
            </div>
          </form>
        </div>

        <div className="space-y-3">
          {properties.map((p) => (
            <div key={p.id} className="app-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted">{p.address}</p>
                <p className="text-xs text-muted mt-1">
                  {p.status} · {formatGBP(p.currentValue)} · {p.imageUrls.length} image(s)
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteProperty(p.id)}
                className="app-btn app-btn-danger text-xs"
                disabled={!canWriteProperties}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-semibold">Bookings (Nova-managed stays)</h2>
        <p className="text-sm text-muted -mt-2">
          Record stays Nova operated on this investor&apos;s properties — lease,
          short let, Airbnb, Booking.com, or direct. Revenue flows to their
          portal returns.
        </p>
        <div className="app-card p-5">
          <form onSubmit={addBooking} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FormSelect
                name="propertyId"
                label="Property"
                required
                defaultValue=""
                placeholder="Select property"
                options={[
                  { value: "", label: "Select property", disabled: true },
                  ...properties.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Start</label>
              <input name="startDate" type="date" required className="app-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">End</label>
              <input name="endDate" type="date" required className="app-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Guest</label>
              <input name="guestName" className="app-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Revenue</label>
              <input name="revenue" type="number" min={0} defaultValue={0} className="app-input" />
            </div>
            <div>
              <FormSelect
                name="channel"
                label="Channel"
                defaultValue="direct"
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
                defaultValue="confirmed"
                options={[
                  { value: "confirmed", label: "confirmed" },
                  { value: "pending", label: "pending" },
                  { value: "cancelled", label: "cancelled" },
                ]}
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="app-btn app-btn-primary"
                disabled={!properties.length || !canWriteBookings}
              >
                Add booking
              </button>
            </div>
          </form>
        </div>

        <div className="app-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    {properties.find((p) => p.id === b.propertyId)?.name || b.propertyId}
                  </td>
                  <td className="px-4 py-3">
                    {String(b.startDate).slice(0, 10)} → {String(b.endDate).slice(0, 10)}
                  </td>
                  <td className="px-4 py-3">{formatGBP(b.revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => deleteBooking(b.id)}
                      className="text-danger text-xs font-medium"
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

      <section className="space-y-4">
        <h2 className="font-semibold">Analytics periods (investor-facing returns)</h2>
        <p className="text-sm text-muted -mt-2">
          Monthly summary investors see for Nova-managed performance —
          revenue, commission, occupancy, and channel mix.
        </p>
        <div className="app-card p-5">
          <form onSubmit={saveAnalytics} className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Period (YYYY-MM)</label>
              <input name="period" required placeholder="2026-07" className="app-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Occupancy %</label>
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
              <input name="revenue" type="number" min={0} defaultValue={0} className="app-input" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Commission</label>
              <input name="commission" type="number" min={0} defaultValue={0} className="app-input" />
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
              <button type="submit" className="app-btn app-btn-primary" disabled={!canWriteAnalytics}>
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
                  Rev {formatGBP(a.revenue)} · Comm {formatGBP(a.commission)} · Occ{" "}
                  {a.occupancyRate}%
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
    </div>
  );
}
