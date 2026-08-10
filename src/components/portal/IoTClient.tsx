"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

type Device = {
  id: string;
  name: string;
  type: string;
  status: string;
  listingId: string | null;
  externalId: string | null;
  lastTelemetry: Record<string, unknown> | null;
};

export default function IoTClient() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"lock" | "meter" | "sensor">("lock");
  const [listingId, setListingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/iot");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load devices.");
      return;
    }
    setDevices(data.devices || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/iot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        type,
        listingId: listingId || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not add device.");
      return;
    }
    setName("");
    setListingId("");
    setMessage("Device added (pairing).");
    await load();
  }

  async function onCommand(id: string, command: "lock" | "unlock" | "sync") {
    setBusyId(id);
    setError("");
    setMessage("");
    const res = await fetch(`/api/portal/iot/${id}/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Command failed.");
      return;
    }
    setMessage(`Command “${command}” sent.`);
    await load();
  }

  if (loading) return <TableSkeleton rows={3} />;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      <form onSubmit={onCreate} className="app-card p-4 sm:p-5 space-y-4 max-w-xl">
        <h2 className="font-semibold">Pair a device</h2>
        <div>
          <label className="block text-sm font-medium mb-1.5">Name</label>
          <input
            className="app-input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Front door lock"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Type</label>
          <select
            className="app-input w-full"
            value={type}
            onChange={(e) =>
              setType(e.target.value as "lock" | "meter" | "sensor")
            }
          >
            <option value="lock">Lock</option>
            <option value="meter">Meter</option>
            <option value="sensor">Sensor</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Listing ID (optional)
          </label>
          <input
            className="app-input w-full"
            value={listingId}
            onChange={(e) => setListingId(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="app-btn app-btn-primary text-sm"
        >
          {saving ? "Adding…" : "Add device"}
        </button>
      </form>

      {devices.length === 0 ? (
        <EmptyState
          title="No IoT devices"
          description="Pair smart locks, meters, or sensors for mock telemetry and commands."
        />
      ) : (
        <ul className="space-y-3">
          {devices.map((d) => (
            <li key={d.id} className="app-card p-4 space-y-3">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {d.name}{" "}
                    <span className="text-xs text-muted capitalize">
                      · {d.type} · {d.status}
                    </span>
                  </p>
                  {d.lastTelemetry ? (
                    <p className="text-xs text-muted mt-1">
                      Last: {JSON.stringify(d.lastTelemetry)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {d.type === "lock" ? (
                    <>
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => void onCommand(d.id, "lock")}
                        className="app-btn app-btn-secondary text-xs"
                      >
                        Lock
                      </button>
                      <button
                        type="button"
                        disabled={busyId === d.id}
                        onClick={() => void onCommand(d.id, "unlock")}
                        className="app-btn app-btn-secondary text-xs"
                      >
                        Unlock
                      </button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === d.id}
                    onClick={() => void onCommand(d.id, "sync")}
                    className="app-btn app-btn-secondary text-xs"
                  >
                    Sync
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
