"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/rbac";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { Reveal } from "@/components/motion/Motion";

type UserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  profiles: {
    id: string;
    type: string;
    status: string;
    displayName: string;
    verifiedAt?: string;
  }[];
};

export default function AdminUsersClient() {
  const { data: session } = useSession();
  const canWrite = hasPermission(session?.user?.permissions, "users:write");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyKey, setBusyKey] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    const res = await fetch(`/api/admin/users${qs}`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load users.");
      return;
    }
    setRows(data.users || []);
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(body: Record<string, string>) {
    setBusyKey(JSON.stringify(body));
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setBusyKey("");
    if (!res.ok) {
      setError(data.error || "Action failed.");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Users
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Verify emails and profiles manually — including users who have not
          uploaded KYC documents yet.
        </p>
      </Reveal>

      <div className="flex flex-wrap gap-2">
        <input
          className="app-input max-w-sm"
          placeholder="Search name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void load();
          }}
        />
        <button
          type="button"
          className="app-btn app-btn-secondary text-sm"
          onClick={() => void load()}
        >
          Search
        </button>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No users found"
          description="Try a different search or wait for new signups."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((u) => (
            <li key={u.id} className="app-card app-card-interactive p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-sm text-muted">{u.email}</p>
                  <p className="text-xs text-muted mt-1">
                    Joined {new Date(u.createdAt).toLocaleDateString()}
                    {u.phoneVerified ? " · Phone verified" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`text-[11px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                      u.emailVerified
                        ? "bg-brand-subtle text-brand"
                        : "bg-surface-dark text-muted"
                    }`}
                  >
                    {u.emailVerified ? "Email verified" : "Email pending"}
                  </span>
                </div>
              </div>

              {canWrite ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                  {u.emailVerified ? (
                    <button
                      type="button"
                      disabled={busyKey !== ""}
                      className="app-btn app-btn-secondary text-xs"
                      onClick={() =>
                        void act({ action: "unverify_email", userId: u.id })
                      }
                    >
                      Unverify email
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busyKey !== ""}
                      className="app-btn app-btn-primary text-xs"
                      onClick={() =>
                        void act({ action: "verify_email", userId: u.id })
                      }
                    >
                      Verify email manually
                    </button>
                  )}
                </div>
              ) : null}

              {u.profiles.length ? (
                <ul className="space-y-2 border-t border-border pt-3">
                  {u.profiles.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <div>
                        <span className="font-medium capitalize">
                          {p.type.replace("_", " ")}
                        </span>
                        <span className="text-muted"> · {p.displayName}</span>
                        <span className="ml-2 text-xs uppercase tracking-wider font-semibold text-muted">
                          {p.status}
                        </span>
                      </div>
                      {canWrite && p.status !== "verified" ? (
                        <button
                          type="button"
                          disabled={busyKey !== ""}
                          className="app-btn app-btn-primary text-xs"
                          onClick={() =>
                            void act({
                              action: "verify_profile",
                              profileId: p.id,
                            })
                          }
                        >
                          Verify profile
                        </button>
                      ) : canWrite && p.status === "verified" ? (
                        <button
                          type="button"
                          disabled={busyKey !== ""}
                          className="app-btn app-btn-secondary text-xs"
                          onClick={() =>
                            void act({
                              action: "suspend_profile",
                              profileId: p.id,
                            })
                          }
                        >
                          Suspend
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted border-t border-border pt-3">
                  No profiles yet — user can create one from the app.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
