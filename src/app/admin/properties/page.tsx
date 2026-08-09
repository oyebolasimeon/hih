"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Select from "@/components/ui/Select";
import { formatGBP } from "@/lib/format";
import { hasPermission } from "@/lib/rbac";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

type PropertyRow = {
  id: string;
  ownerType: "company" | "investor";
  investorId: string | null;
  investorName: string;
  investorEmail: string;
  name: string;
  address: string;
  imageUrls: string[];
  status: string;
  purchasePrice: number;
  currentValue: number;
  notes?: string;
};

const emptyForm = {
  name: "",
  address: "",
  status: "active",
  purchasePrice: "0",
  currentValue: "0",
  notes: "",
};

export default function AdminPropertiesClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "properties:write");

  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [owner, setOwner] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    if (owner !== "all") params.set("owner", owner);
    const res = await fetch(`/api/admin/properties?${params}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load properties.");
      return;
    }
    setProperties(data.properties || []);
  }, [q, status, owner]);

  useEffect(() => {
    void load();
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    void load();
  }

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setImages(null);
    setShowForm(true);
    setMessage("");
    setError("");
  }

  function startEdit(p: PropertyRow) {
    if (p.ownerType !== "company") return;
    setEditingId(p.id);
    setForm({
      name: p.name,
      address: p.address,
      status: p.status,
      purchasePrice: String(p.purchasePrice),
      currentValue: String(p.currentValue),
      notes: p.notes || "",
    });
    setImages(null);
    setShowForm(true);
    setMessage("");
    setError("");
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!canWrite) return;
    setSaving(true);
    setError("");
    setMessage("");

    const body = new FormData();
    body.append("name", form.name);
    body.append("address", form.address);
    body.append("status", form.status);
    body.append("purchasePrice", form.purchasePrice);
    body.append("currentValue", form.currentValue);
    body.append("notes", form.notes);
    if (images) {
      Array.from(images).forEach((file) => body.append("images", file));
    }

    const res = await fetch(
      editingId ? `/api/admin/properties/${editingId}` : "/api/admin/properties",
      {
        method: editingId ? "PATCH" : "POST",
        body,
      }
    );
    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error || "Unable to save property.");
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setImages(null);
    setMessage(
      editingId
        ? "Nova property updated."
        : "Nova property added to the company portfolio."
    );
    await load();
  }

  async function onDelete(id: string) {
    if (!canWrite) return;
    if (!confirm("Delete this Nova Elite property?")) return;
    setError("");
    const res = await fetch(`/api/admin/properties/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Unable to delete property.");
      return;
    }
    setMessage("Property deleted.");
    if (editingId === id) {
      setShowForm(false);
      setEditingId(null);
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">
            Properties
          </h1>
          <p className="mt-1 text-sm text-muted max-w-2xl">
            Nova Elite company portfolio (admin-only) and investor properties.
            Company assets never appear in the investor portal.
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            onClick={startCreate}
            className="app-btn app-btn-primary shrink-0"
          >
            Add Nova property
          </button>
        ) : null}
      </div>

      <form
        onSubmit={onSearch}
        className="flex flex-col lg:flex-row gap-3 max-w-4xl"
      >
        <input
          className="app-input"
          placeholder="Search name or address"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          className="lg:w-44"
          value={owner}
          onChange={setOwner}
          options={[
            { value: "all", label: "All owners" },
            { value: "company", label: "Nova Elite only" },
            { value: "investor", label: "Investors only" },
          ]}
        />
        <Select
          className="lg:w-40"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All statuses" },
            { value: "active", label: "active" },
            { value: "inactive", label: "inactive" },
            { value: "sold", label: "sold" },
          ]}
        />
        <button type="submit" className="app-btn app-btn-secondary">
          Search
        </button>
      </form>

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

      {showForm ? (
        <form
          onSubmit={onSave}
          className="app-card p-5 sm:p-6 space-y-4 max-w-3xl"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold">
                {editingId ? "Edit Nova property" : "New Nova property"}
              </h2>
              <p className="text-sm text-muted mt-0.5">
                Owned and managed by Nova Elite Homes — not linked to an
                investor.
              </p>
            </div>
            <button
              type="button"
              className="text-sm text-muted hover:text-foreground"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Name</label>
              <input
                className="app-input"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Address</label>
              <input
                className="app-input"
                required
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Status</label>
              <Select
                value={form.status}
                onChange={(v) => setForm({ ...form, status: v })}
                options={[
                  { value: "active", label: "active" },
                  { value: "inactive", label: "inactive" },
                  { value: "sold", label: "sold" },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Purchase price (£)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                className="app-input"
                value={form.purchasePrice}
                onChange={(e) =>
                  setForm({ ...form, purchasePrice: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Current value (£)
              </label>
              <input
                type="number"
                min={0}
                step="1"
                className="app-input"
                value={form.currentValue}
                onChange={(e) =>
                  setForm({ ...form, currentValue: e.target.value })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">Notes</label>
              <textarea
                className="app-input min-h-[88px]"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Internal notes for Nova operations"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5">
                Images {editingId ? "(added to existing)" : ""}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="block w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[#0c0d0b]"
                onChange={(e) => setImages(e.target.files)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="app-btn app-btn-primary"
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Create property"}
          </button>
        </form>
      ) : null}

      {loading ? (
        <>
          <PageHeaderSkeleton />
          <TableSkeleton rows={6} cols={5} />
        </>
      ) : properties.length === 0 ? (
        <EmptyState
          title="No properties found"
          description={
            canWrite
              ? "Add a Nova Elite company property, or open an investor to manage their portfolio."
              : "No properties match your filters."
          }
        />
      ) : (
        <div className="app-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Property</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {properties.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-14 overflow-hidden rounded bg-surface-dark shrink-0">
                        {p.imageUrls[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.imageUrls[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted line-clamp-1">
                          {p.address}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {p.ownerType === "company" ? (
                      <>
                        <p className="font-medium">Nova Elite Homes</p>
                        <p className="text-xs text-brand font-medium">
                          Company portfolio
                        </p>
                      </>
                    ) : (
                      <>
                        <p>{p.investorName}</p>
                        <p className="text-xs text-muted">{p.investorEmail}</p>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">
                    {formatGBP(p.currentValue)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {p.ownerType === "company" ? (
                        <>
                          {canWrite ? (
                            <>
                              <button
                                type="button"
                                className="text-brand font-medium hover:underline"
                                onClick={() => startEdit(p)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="text-danger font-medium hover:underline"
                                onClick={() => void onDelete(p.id)}
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-muted">View only</span>
                          )}
                        </>
                      ) : p.investorId ? (
                        <Link
                          href={`/admin/investors/${p.investorId}`}
                          className="text-brand font-medium hover:underline"
                        >
                          Manage investor
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
