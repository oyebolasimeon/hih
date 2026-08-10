"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
import {
  PERMISSION_LABELS,
  PERMISSIONS,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  type AdminRole,
  type Permission,
} from "@/lib/rbac";
import { FormSkeleton, TableSkeleton, PageHeaderSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";

type AdminRow = {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  permissions: Permission[];
  source: "env" | "invite";
  active: boolean;
  pending?: boolean;
};

export default function TeamClient() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("ops_kyc");
  const [perms, setPerms] = useState<Permission[]>([...ROLE_PERMISSIONS.ops_kyc]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/team");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load team.");
      return;
    }
    setAdmins(data.admins || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (role === "superadmin") {
      setPerms([...PERMISSIONS]);
    } else {
      setPerms([...ROLE_PERMISSIONS[role]]);
    }
  }, [role]);

  function togglePerm(p: Permission) {
    if (role === "superadmin") return;
    setPerms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        role,
        permissions: role === "superadmin" ? PERMISSIONS : perms,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to add admin.");
      return;
    }
    setEmail("");
    setMessage(
      "Admin added. Their session permissions refresh within about a minute (or on next sign-in)."
    );
    await load();
  }

  async function saveEdit(admin: AdminRow) {
    setError("");
    const res = await fetch(`/api/admin/team/${admin.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: admin.role,
        permissions: admin.permissions,
        active: admin.active,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to update admin.");
      return;
    }
    setEditingId(null);
    setMessage(
      "Admin updated. Their session permissions refresh within about a minute (or on next sign-in)."
    );
    await load();
  }

  async function removeAdmin(id: string) {
    if (!confirm("Remove this admin?")) return;
    const res = await fetch(`/api/admin/team/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to remove admin.");
      return;
    }
    setMessage("Admin removed.");
    await load();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeaderSkeleton />
        <FormSkeleton />
        <TableSkeleton rows={4} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Team & RBAC
        </h1>
        <p className="mt-1 text-sm text-muted">
          Env bootstrap admins can invite teammates and assign roles / permissions.
          New admins must already have a registered account.
        </p>
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

      <section className="app-card p-5 sm:p-6 space-y-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Add admin</h2>
          <p className="text-sm text-muted mt-1">
            Invite a registered user and assign a role or custom permission set.
          </p>
        </div>
        <form onSubmit={onAdd} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium mb-1.5">User email</label>
            <input
              type="email"
              required
              className="app-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="already-registered@example.com"
            />
          </div>
          <Select
            label="Role"
            value={role}
            onChange={(v) => setRole(v as AdminRole)}
            options={[
              { value: "content_editor", label: ROLE_LABELS.content_editor },
              { value: "ops_kyc", label: ROLE_LABELS.ops_kyc },
              { value: "superadmin", label: ROLE_LABELS.superadmin },
            ]}
          />
          <div className="sm:col-span-2 space-y-3">
            <div>
              <p className="text-sm font-medium">Permissions</p>
              <p className="text-xs text-muted mt-0.5">
                Role presets fill these in. Customise as needed before inviting.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {PERMISSIONS.map((p) => (
                <Checkbox
                  key={p}
                  variant="card"
                  label={PERMISSION_LABELS[p]}
                  checked={perms.includes(p)}
                  disabled={role === "superadmin"}
                  onChange={() => togglePerm(p)}
                />
              ))}
            </div>
          </div>
          <div>
            <button type="submit" className="app-btn app-btn-primary">
              Add admin
            </button>
          </div>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Current admins</h2>
        {admins.length === 0 ? (
          <EmptyState
            title="No admins yet"
            description="Environment bootstrap emails become superadmins on first login."
          />
        ) : (
          admins.map((admin) => {
            const editing = editingId === admin.id;
            return (
              <div key={admin.id} className="app-card p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{admin.name}</p>
                    <p className="text-sm text-muted">{admin.email}</p>
                    <p className="text-xs text-muted mt-1 uppercase tracking-wider">
                      {admin.role} · {admin.source}
                      {admin.pending ? " · pending first login" : ""}
                      {!admin.active ? " · inactive" : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!admin.pending && admin.source !== "env" ? (
                      <>
                        <button
                          type="button"
                          className="app-btn app-btn-secondary text-xs"
                          onClick={() =>
                            setEditingId(editing ? null : admin.id)
                          }
                        >
                          {editing ? "Close" : "Edit RBAC"}
                        </button>
                        <button
                          type="button"
                          className="app-btn app-btn-danger text-xs"
                          onClick={() => removeAdmin(admin.id)}
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-muted self-center">
                        Protected bootstrap admin
                      </span>
                    )}
                  </div>
                </div>

                {editing ? (
                  <div className="border-t border-border pt-3 space-y-3">
                    <Select
                      label="Role"
                      value={admin.role}
                      onChange={(v) =>
                        setAdmins((rows) =>
                          rows.map((r) =>
                            r.id === admin.id
                              ? {
                                  ...r,
                                  role: v as AdminRole,
                                  permissions:
                                    v === "superadmin"
                                      ? [...PERMISSIONS]
                                      : [...ROLE_PERMISSIONS[v as AdminRole]],
                                }
                              : r
                          )
                        )
                      }
                      options={[
                        { value: "content_editor", label: ROLE_LABELS.content_editor },
                        { value: "ops_kyc", label: ROLE_LABELS.ops_kyc },
                        { value: "superadmin", label: ROLE_LABELS.superadmin },
                      ]}
                    />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Permissions</p>
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        {PERMISSIONS.map((p) => (
                          <Checkbox
                            key={p}
                            variant="card"
                            label={PERMISSION_LABELS[p]}
                            checked={admin.permissions.includes(p)}
                            disabled={admin.role === "superadmin"}
                            onChange={() =>
                              setAdmins((rows) =>
                                rows.map((r) => {
                                  if (r.id !== admin.id) return r;
                                  const next = r.permissions.includes(p)
                                    ? r.permissions.filter((x) => x !== p)
                                    : [...r.permissions, p];
                                  return { ...r, permissions: next };
                                })
                              )
                            }
                          />
                        ))}
                      </div>
                    </div>
                    <Checkbox
                      label="Active"
                      description="Inactive admins cannot access the console."
                      checked={admin.active}
                      onChange={(checked) =>
                        setAdmins((rows) =>
                          rows.map((r) =>
                            r.id === admin.id ? { ...r, active: checked } : r
                          )
                        )
                      }
                    />
                    <button
                      type="button"
                      className="app-btn app-btn-primary text-sm"
                      onClick={() => saveEdit(admin)}
                    >
                      Save changes
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {admin.permissions.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center rounded-md border border-brand/25 bg-brand-subtle px-2 py-1 text-[11px] font-medium text-foreground"
                      >
                        {PERMISSION_LABELS[p] || p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}
