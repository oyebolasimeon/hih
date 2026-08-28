"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";

type Agreement = {
  id: string;
  status: string;
  rentAmount: number;
  currency: string;
  paymentPeriod: string;
  termsText: string;
  tenantSignatureName: string;
  landlordSignatureName: string;
  tenantSignedAt: string | null;
  landlordSignedAt: string | null;
  signedAt: string | null;
  startDate: string;
  endDate: string | null;
  legalProvider: "hih" | "own_legal";
  legalCompanyName: string;
  agreementFeePercent: number;
  agreementFeeAmount: number;
  agreementFeePaidAt: string | null;
  documentUrl: string | null;
  documentNumber: string | null;
  listing: { id: string; title: string; city?: string; state?: string } | null;
};

function formatMoney(amount: number, currency = "NGN") {
  return `${currency} ${amount.toLocaleString()}`;
}

export default function AgreementsClient() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Agreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [signatureName, setSignatureName] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState("");
  const [payingFeeId, setPayingFeeId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/agreements");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load agreements.");
      return;
    }
    setRows(data.agreements || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const feePaid = searchParams.get("fee_paid");
    const mockRef = searchParams.get("mock_ref");
    const ref = mockRef || searchParams.get("reference");
    if (feePaid === "1" && ref) {
      void (async () => {
        setError("");
        const res = await fetch(
          `/api/portal/payments/verify?reference=${encodeURIComponent(ref)}`
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not verify agreement fee.");
          return;
        }
        setMessage("Agreement fee paid. You can now sign as tenant.");
        await load();
      })();
    }
  }, [searchParams, load]);

  async function payFee(id: string) {
    setPayingFeeId(id);
    setError("");
    setMessage("");
    const res = await fetch(`/api/portal/agreements/${id}/pay-fee`, {
      method: "POST",
    });
    const data = await res.json();
    setPayingFeeId("");
    if (!res.ok) {
      setError(data.error || "Could not start agreement fee payment.");
      return;
    }
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    }
  }

  async function sign(
    e: FormEvent,
    id: string,
    role: "tenant" | "landlord"
  ) {
    e.preventDefault();
    const name = (signatureName[`${id}-${role}`] || "").trim();
    if (name.length < 2) {
      setError("Enter your full name as signature.");
      return;
    }
    setBusyKey(`${id}-${role}`);
    setError("");
    setMessage("");
    const res = await fetch(`/api/portal/agreements/${id}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, signatureName: name }),
    });
    const data = await res.json();
    setBusyKey("");
    if (!res.ok) {
      setError(data.error || "Could not sign agreement.");
      return;
    }
    setMessage(
      data.agreement?.status === "active"
        ? "Both parties signed — lease is active. Signed PDF emailed to both parties."
        : "Signature recorded."
    );
    await load();
  }

  if (loading) return <TableSkeleton rows={3} />;

  return (
    <div className="space-y-4">
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-brand-dark">{message}</p> : null}

      {rows.length === 0 ? (
        <EmptyState
          title="No agreements"
          description="Approved applications create lease drafts here for e-signature."
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((a) => (
            <li key={a.id} className="app-card p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {a.listing?.title || "Property"} · {a.status}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {formatMoney(a.rentAmount, a.currency)} / {a.paymentPeriod}
                    {a.endDate
                      ? ` · until ${new Date(a.endDate).toLocaleDateString()}`
                      : ""}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Legal:{" "}
                    {a.legalProvider === "hih"
                      ? "House In Hand"
                      : a.legalCompanyName || "Landlord legal partner"}
                  </p>
                </div>
                {a.documentUrl ? (
                  <a
                    href={a.documentUrl}
                    className="app-btn app-btn-secondary text-xs"
                  >
                    Download signed PDF
                  </a>
                ) : null}
              </div>

              <div className="rounded-lg border border-border/60 bg-surface/40 p-3 text-sm space-y-2">
                <p className="font-medium">Agreement fee (tenant pays first)</p>
                <p className="text-muted text-xs">
                  {a.agreementFeePercent}% of rent ={" "}
                  {formatMoney(a.agreementFeeAmount, a.currency)}
                  {a.legalProvider === "hih"
                    ? " → House In Hand wallet"
                    : " → Landlord wallet"}
                </p>
                {a.agreementFeePaidAt ? (
                  <p className="text-brand-dark text-xs font-medium">
                    Paid on {new Date(a.agreementFeePaidAt).toLocaleString()}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => void payFee(a.id)}
                    disabled={payingFeeId === a.id}
                    className="app-btn app-btn-primary text-xs"
                  >
                    {payingFeeId === a.id
                      ? "Redirecting…"
                      : `Pay ${formatMoney(a.agreementFeeAmount, a.currency)}`}
                  </button>
                )}
              </div>

              {a.termsText ? (
                <pre className="text-xs text-muted whitespace-pre-wrap rounded-md border border-border bg-surface-dark/40 p-3 max-h-48 overflow-auto">
                  {a.termsText}
                </pre>
              ) : null}

              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-md border border-border p-3 space-y-2">
                  <p className="font-medium">Tenant</p>
                  {a.tenantSignedAt ? (
                    <p className="text-xs text-muted">
                      Signed by {a.tenantSignatureName} on{" "}
                      {new Date(a.tenantSignedAt).toLocaleString()}
                    </p>
                  ) : (
                    <form
                      onSubmit={(e) => void sign(e, a.id, "tenant")}
                      className="space-y-2"
                    >
                      {!a.agreementFeePaidAt ? (
                        <p className="text-xs text-muted">
                          Pay the agreement fee before signing.
                        </p>
                      ) : null}
                      <input
                        className="app-input w-full text-sm"
                        placeholder="Full name"
                        value={signatureName[`${a.id}-tenant`] || ""}
                        onChange={(e) =>
                          setSignatureName({
                            ...signatureName,
                            [`${a.id}-tenant`]: e.target.value,
                          })
                        }
                        disabled={!a.agreementFeePaidAt}
                      />
                      <button
                        type="submit"
                        disabled={
                          busyKey === `${a.id}-tenant` || !a.agreementFeePaidAt
                        }
                        className="app-btn app-btn-primary text-xs disabled:opacity-50"
                      >
                        Sign as tenant
                      </button>
                    </form>
                  )}
                </div>
                <div className="rounded-md border border-border p-3 space-y-2">
                  <p className="font-medium">Landlord</p>
                  {a.landlordSignedAt ? (
                    <p className="text-xs text-muted">
                      Signed by {a.landlordSignatureName} on{" "}
                      {new Date(a.landlordSignedAt).toLocaleString()}
                    </p>
                  ) : (
                    <form
                      onSubmit={(e) => void sign(e, a.id, "landlord")}
                      className="space-y-2"
                    >
                      <input
                        className="app-input w-full text-sm"
                        placeholder="Full name"
                        value={signatureName[`${a.id}-landlord`] || ""}
                        onChange={(e) =>
                          setSignatureName({
                            ...signatureName,
                            [`${a.id}-landlord`]: e.target.value,
                          })
                        }
                      />
                      <button
                        type="submit"
                        disabled={busyKey === `${a.id}-landlord`}
                        className="app-btn app-btn-primary text-xs"
                      >
                        Sign as landlord
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
