"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { StatCardsSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

type UtilityCategory =
  | "electricity"
  | "water"
  | "waste"
  | "estate_dues"
  | "internet"
  | "cable";

type ProviderDef = {
  id: string;
  name: string;
  category: UtilityCategory;
  integrated: boolean;
  accountLabel: string;
  requiresMeterType?: boolean;
  minAmount?: number;
  amountPresets?: number[];
};

type CategoryDef = {
  id: UtilityCategory;
  label: string;
  description: string;
};

type Bill = {
  id: string;
  category: string;
  provider: string;
  providerId: string;
  accountNumber: string;
  meterType: string | null;
  customerName: string | null;
  amount: number;
  currency: string;
  status: string;
  integration: string;
  purchaseToken: string | null;
  providerRef: string | null;
  paidAt: string | null;
  createdAt: string;
};

type VerifiedAccount = {
  customerName: string | null;
  address: string | null;
  accountNumber: string;
  manual: boolean;
};

function formatMoney(amount: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function categoryLabel(id: string) {
  return id.replace("_", " ");
}

function statusClass(status: string) {
  if (status === "paid") return "bg-teal/15 text-brand border-teal/30";
  if (status === "failed") return "bg-danger/10 text-danger border-danger/30";
  return "bg-brand/10 text-brand-dark border-brand/25";
}

export default function UtilitiesClient() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<CategoryDef[]>([]);
  const [providers, setProviders] = useState<ProviderDef[]>([]);
  const [integrationMode, setIntegrationMode] = useState("mock");
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [category, setCategory] = useState<UtilityCategory>("electricity");
  const [providerId, setProviderId] = useState("");
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [accountNumber, setAccountNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [verified, setVerified] = useState<VerifiedAccount | null>(null);

  const categoryProviders = useMemo(
    () => providers.filter((p) => p.category === category),
    [providers, category]
  );

  const selectedProvider = useMemo(
    () => providers.find((p) => p.id === providerId) || null,
    [providers, providerId]
  );

  const stats = useMemo(() => {
    const paid = bills.filter((b) => b.status === "paid");
    const pending = bills.filter((b) => b.status === "pending");
    return {
      paidCount: paid.length,
      pendingCount: pending.length,
      totalPaid: paid.reduce((s, b) => s + b.amount, 0),
    };
  }, [bills]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [pRes, bRes] = await Promise.all([
      fetch("/api/portal/utilities/providers"),
      fetch("/api/portal/utilities"),
    ]);
    const pData = await pRes.json();
    const bData = await bRes.json();
    setLoading(false);
    if (!bRes.ok) {
      setError(bData.error || "Unable to load bills.");
      return;
    }
    if (pRes.ok) {
      setCategories(pData.categories || []);
      setProviders(pData.providers || []);
      setIntegrationMode(pData.integrationMode || "mock");
    }
    setBills(bData.bills || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const first = categoryProviders[0];
    if (first && !categoryProviders.some((p) => p.id === providerId)) {
      setProviderId(first.id);
      setVerified(null);
    }
  }, [category, categoryProviders, providerId]);

  useEffect(() => {
    setVerified(null);
  }, [providerId, accountNumber, meterType]);

  useEffect(() => {
    const paid = searchParams.get("paid");
    const ref =
      searchParams.get("reference") ||
      searchParams.get("trxref") ||
      searchParams.get("mock_ref");
    if (paid !== "1" || !ref) return;

    void (async () => {
      setConfirming(true);
      setError("");
      const res = await fetch(
        `/api/portal/utilities/verify-payment?reference=${encodeURIComponent(ref)}`
      );
      const data = await res.json();
      setConfirming(false);
      if (!res.ok) {
        setError(data.error || "Could not confirm payment.");
        return;
      }
      const token = data.bill?.purchaseToken;
      setMessage(
        token
          ? `Payment successful. Your token: ${token}`
          : "Utility bill paid successfully."
      );
      setVerified(null);
      setAccountNumber("");
      setAmount("");
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!providerId || !accountNumber.trim()) {
      setError("Select a provider and enter your account number.");
      return;
    }
    setVerifying(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/utilities/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId,
        accountNumber: accountNumber.trim(),
        meterType: selectedProvider?.requiresMeterType ? meterType : undefined,
      }),
    });
    const data = await res.json();
    setVerifying(false);
    if (!res.ok) {
      setError(data.error || "Verification failed.");
      return;
    }
    setVerified({
      customerName: data.customerName,
      address: data.address,
      accountNumber: data.accountNumber,
      manual: data.manual,
    });
    setMessage(
      data.manual
        ? "Account saved — proceed to payment."
        : `Verified: ${data.customerName}`
    );
  }

  async function onPay(e: FormEvent) {
    e.preventDefault();
    if (!verified || !providerId) {
      setError("Verify your account before paying.");
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setError("Enter a valid phone number for receipts.");
      return;
    }

    setPaying(true);
    setError("");
    setMessage("");

    const createRes = await fetch("/api/portal/utilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId,
        accountNumber: verified.accountNumber,
        meterType: selectedProvider?.requiresMeterType ? meterType : undefined,
        customerName: verified.customerName || undefined,
        customerAddress: verified.address || undefined,
        phone: phone.trim(),
        amount: numAmount,
      }),
    });
    const createData = await createRes.json();
    if (!createRes.ok) {
      setPaying(false);
      setError(createData.error || "Could not create bill.");
      return;
    }

    const payRes = await fetch(
      `/api/portal/utilities/${createData.bill.id}/pay`,
      { method: "POST" }
    );
    const payData = await payRes.json();
    setPaying(false);
    if (!payRes.ok) {
      setError(payData.error || "Could not start payment.");
      return;
    }

    if (payData.authorization_url) {
      window.location.href = payData.authorization_url;
      return;
    }
    setError("Payment URL missing.");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <StatCardsSkeleton count={3} />
        <TableSkeleton rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error ? (
        <p className="text-sm text-danger rounded-md border border-danger/20 bg-danger/5 px-3 py-2" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-brand-dark rounded-md border border-brand/20 bg-brand/5 px-3 py-2">
          {message}
        </p>
      ) : null}
      {confirming ? (
        <p className="text-sm text-muted">Confirming your payment…</p>
      ) : null}

      <section className="grid sm:grid-cols-3 gap-3">
        <Reveal>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Total paid
            </p>
            <p className="mt-2 text-2xl font-display font-semibold">
              {formatMoney(stats.totalPaid)}
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.04}>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Completed
            </p>
            <p className="mt-2 text-2xl font-display font-semibold">
              {stats.paidCount}
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Pending
            </p>
            <p className="mt-2 text-2xl font-display font-semibold">
              {stats.pendingCount}
            </p>
          </div>
        </Reveal>
      </section>

      <Reveal>
        <section className="app-card overflow-hidden">
          <div className="px-5 py-6 sm:px-6 border-b border-border/60 bg-gradient-to-br from-brand/10 to-transparent">
            <h2 className="font-display text-lg font-semibold">Pay a bill</h2>
            <p className="text-sm text-muted mt-1">
              Verify your meter or account, then pay securely via Paystack
              {integrationMode === "mock" ? " (demo mode — VTpass mock)" : " + VTpass"}.
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategory(c.id)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    category === c.id
                      ? "border-brand bg-brand/10 font-semibold"
                      : "border-border text-muted hover:border-brand/40"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <p className="text-xs text-muted">
              {categories.find((c) => c.id === category)?.description}
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="Provider"
                value={providerId}
                onChange={setProviderId}
                options={categoryProviders.map((p) => ({
                  value: p.id,
                  label: p.name + (p.integrated ? "" : " (manual)"),
                }))}
                placeholder="Choose provider"
                required
              />

              {selectedProvider?.requiresMeterType ? (
                <Select
                  label="Meter type"
                  value={meterType}
                  onChange={(v) => setMeterType(v as "prepaid" | "postpaid")}
                  options={[
                    { value: "prepaid", label: "Prepaid" },
                    { value: "postpaid", label: "Postpaid" },
                  ]}
                />
              ) : null}
            </div>

            <form onSubmit={onVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {selectedProvider?.accountLabel || "Account number"}
                </label>
                <input
                  className="app-input w-full"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={
                    selectedProvider?.requiresMeterType
                      ? "Enter meter number"
                      : "Enter account / smartcard number"
                  }
                  required
                />
              </div>
              <button
                type="submit"
                disabled={verifying || !providerId}
                className="app-btn app-btn-secondary text-sm"
              >
                {verifying ? "Verifying…" : "Verify account"}
              </button>
            </form>

            {verified ? (
              <div className="rounded-lg border border-brand/25 bg-brand/5 p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                    Verified account
                  </p>
                  {verified.customerName ? (
                    <p className="mt-1 font-semibold">{verified.customerName}</p>
                  ) : null}
                  <p className="text-sm text-muted mt-0.5">
                    {verified.accountNumber}
                    {verified.address ? ` · ${verified.address}` : ""}
                  </p>
                </div>

                <form onSubmit={onPay} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Phone (for receipt)
                    </label>
                    <input
                      className="app-input w-full"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08012345678"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Amount (NGN)
                    </label>
                    <input
                      type="number"
                      min={selectedProvider?.minAmount || 1}
                      className="app-input w-full"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                    {selectedProvider?.amountPresets?.length ? (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedProvider.amountPresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAmount(String(preset))}
                            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:border-brand/50 hover:bg-brand/5"
                          >
                            {formatMoney(preset)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="submit"
                    disabled={paying}
                    className="app-btn app-btn-primary text-sm"
                  >
                    {paying ? "Redirecting to Paystack…" : "Pay with Paystack"}
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </section>
      </Reveal>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Payment history</h2>
        {bills.length === 0 ? (
          <EmptyState
            title="No utility payments yet"
            description="Pay electricity, cable TV, or estate dues — your receipts and tokens will show here."
          />
        ) : (
          <Stagger className="grid gap-3">
            {bills.map((b) => (
              <StaggerItem key={b.id}>
                <article className="app-card p-4 sm:p-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold capitalize">
                        {categoryLabel(b.category)} · {b.provider}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass(b.status)}`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      {formatMoney(b.amount, b.currency)}
                      {b.accountNumber ? ` · ${b.accountNumber}` : ""}
                      {b.customerName ? ` · ${b.customerName}` : ""}
                    </p>
                    {b.purchaseToken ? (
                      <p className="text-xs font-mono text-brand-dark mt-2 break-all">
                        Token: {b.purchaseToken}
                      </p>
                    ) : null}
                    {b.paidAt ? (
                      <p className="text-xs text-muted">
                        Paid {new Date(b.paidAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  {b.status === "pending" ? (
                    <button
                      type="button"
                      disabled={paying}
                      onClick={() => {
                        void (async () => {
                          setPaying(true);
                          setError("");
                          const res = await fetch(
                            `/api/portal/utilities/${b.id}/pay`,
                            { method: "POST" }
                          );
                          const data = await res.json();
                          setPaying(false);
                          if (!res.ok) {
                            setError(data.error || "Payment failed.");
                            return;
                          }
                          if (data.authorization_url) {
                            window.location.href = data.authorization_url;
                          }
                        })();
                      }}
                      className="app-btn app-btn-primary text-sm shrink-0"
                    >
                      Complete payment
                    </button>
                  ) : null}
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}
