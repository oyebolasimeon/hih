"use client";

import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/components/ui/EmptyState";
import StatCard from "@/components/ui/StatCard";
import { FormSkeleton } from "@/components/ui/Skeleton";

type Factor = {
  key: string;
  label: string;
  impact: number;
  detail?: string;
};

type CreditScore = {
  id: string;
  score: number;
  band: string;
  factors: Factor[];
  computedAt: string;
};

export default function CreditClient() {
  const [score, setScore] = useState<CreditScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/credit-score");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load credit score.");
      return;
    }
    setScore(data.creditScore);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCompute() {
    setComputing(true);
    setError("");
    const res = await fetch("/api/portal/credit-score", { method: "POST" });
    const data = await res.json();
    setComputing(false);
    if (!res.ok) {
      setError(data.error || "Could not compute score.");
      return;
    }
    setScore(data.creditScore);
  }

  if (loading) return <FormSkeleton />;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onCompute()}
          disabled={computing}
          className="app-btn app-btn-primary text-sm"
        >
          {computing ? "Computing…" : "Compute / refresh score"}
        </button>
      </div>

      {!score ? (
        <EmptyState
          title="No credit score yet"
          description="Run a heuristic score based on KYC, payments, leases, and fraud reports."
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
            <StatCard
              label="Score"
              value={String(score.score)}
              hint="Range 300–850"
            />
            <StatCard
              label="Band"
              value={score.band.replace("_", " ")}
              hint={`Updated ${new Date(score.computedAt).toLocaleString()}`}
            />
          </div>
          <div className="app-card p-5 space-y-3">
            <h2 className="font-semibold">Factors</h2>
            <ul className="space-y-2">
              {score.factors.map((f) => (
                <li
                  key={f.key}
                  className="flex flex-wrap justify-between gap-2 text-sm border-b border-border pb-2"
                >
                  <div>
                    <p className="font-medium">{f.label}</p>
                    {f.detail ? (
                      <p className="text-xs text-muted">{f.detail}</p>
                    ) : null}
                  </div>
                  <span
                    className={
                      f.impact >= 0 ? "text-brand-dark" : "text-danger"
                    }
                  >
                    {f.impact >= 0 ? "+" : ""}
                    {f.impact}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
