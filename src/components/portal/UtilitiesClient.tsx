"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { StatCardsSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { isFixedPriceVariation, parseAmount } from "@/lib/utility-catalog";

type CategoryMeta = {
  portalCategory: string;
  label: string;
  description: string;
  accountLabel: string;
  requiresVerify: boolean;
  requiresMeterType: boolean;
  billersCodeIsPhone: boolean;
};

type VtpassCategory = {
  identifier: string;
  name: string;
  meta: CategoryMeta;
};

type VtpassService = {
  serviceID: string;
  name: string;
  minimium_amount?: string;
  maximum_amount?: string;
  product_type?: string;
  image?: string;
};

type Variation = {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice?: string;
};

type Bill = {
  id: string;
  category: string;
  provider: string;
  providerId: string;
  accountNumber: string;
  variationName: string | null;
  customerName: string | null;
  amount: number;
  currency: string;
  status: string;
  purchaseToken: string | null;
  vtpassStatus: string | null;
  providerRef: string | null;
  vtpassRequestId: string | null;
  paidAt: string | null;
  createdAt: string;
};

type VerifiedAccount = {
  customerName: string | null;
  address: string | null;
  accountNumber: string;
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

function statusClass(status: string) {
  if (status === "paid") return "bg-teal/15 text-brand border-teal/30";
  if (status === "failed") return "bg-danger/10 text-danger border-danger/30";
  return "bg-brand/10 text-brand-dark border-brand/25";
}

export default function UtilitiesClient() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<VtpassCategory[]>([]);
  const [services, setServices] = useState<VtpassService[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [requeryingId, setRequeryingId] = useState<string | null>(null);

  const [vtpassCategory, setVtpassCategory] = useState("");
  const [serviceID, setServiceID] = useState("");
  const [variationCode, setVariationCode] = useState("");
  const [meterType, setMeterType] = useState<"prepaid" | "postpaid">("prepaid");
  const [accountNumber, setAccountNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [verified, setVerified] = useState<VerifiedAccount | null>(null);

  const categoryMeta = useMemo(
    () => categories.find((c) => c.identifier === vtpassCategory)?.meta || null,
    [categories, vtpassCategory]
  );

  const selectedService = useMemo(
    () => services.find((s) => s.serviceID === serviceID) || null,
    [services, serviceID]
  );

  const selectedVariation = useMemo(
    () => variations.find((v) => v.variation_code === variationCode) || null,
    [variations, variationCode]
  );

  const amountLocked = useMemo(
    () =>
      selectedVariation
        ? isFixedPriceVariation(selectedVariation.fixedPrice)
        : false,
    [selectedVariation]
  );

  const needsVerify = categoryMeta?.requiresVerify ?? false;
  const canPay = needsVerify ? Boolean(verified) : true;

  const stats = useMemo(() => {
    const paid = bills.filter((b) => b.status === "paid");
    const pending = bills.filter((b) => b.status === "pending");
    return {
      paidCount: paid.length,
      pendingCount: pending.length,
      totalPaid: paid.reduce((s, b) => s + b.amount, 0),
    };
  }, [bills]);

  const loadBills = useCallback(async () => {
    const res = await fetch("/api/portal/utilities");
    const data = await res.json();
    if (res.ok) setBills(data.bills || []);
  }, []);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/portal/utilities/catalog");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Unable to load bill catalog.");
      return;
    }
    const cats = (data.categories || []) as VtpassCategory[];
    setCategories(cats);
    if (!vtpassCategory && cats[0]) {
      setVtpassCategory(cats[0].identifier);
    }
    await loadBills();
  }, [loadBills, vtpassCategory]);

  useEffect(() => {
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!vtpassCategory) return;
    void (async () => {
      setLoadingServices(true);
      setServices([]);
      setServiceID("");
      setVariations([]);
      setVariationCode("");
      setVerified(null);
      const res = await fetch(
        `/api/portal/utilities/catalog?identifier=${encodeURIComponent(vtpassCategory)}`
      );
      const data = await res.json();
      setLoadingServices(false);
      if (!res.ok) {
        setError(data.error || "Could not load services.");
        return;
      }
      const list = (data.services || []) as VtpassService[];
      setServices(list);
      if (list[0]) setServiceID(list[0].serviceID);
    })();
  }, [vtpassCategory]);

  useEffect(() => {
    if (!serviceID) return;
    void (async () => {
      setLoadingVariations(true);
      setVariations([]);
      setVariationCode("");
      setVerified(null);
      const res = await fetch(
        `/api/portal/utilities/variations?serviceID=${encodeURIComponent(serviceID)}`
      );
      const data = await res.json();
      setLoadingVariations(false);
      if (!res.ok) return;
      const vars = (data.variations || []) as Variation[];
      setVariations(vars);
      if (vars[0]) {
        setVariationCode(vars[0].variation_code);
        if (isFixedPriceVariation(vars[0].fixedPrice)) {
          setAmount(vars[0].variation_amount);
        }
      }
    })();
  }, [serviceID]);

  useEffect(() => {
    if (selectedVariation && isFixedPriceVariation(selectedVariation.fixedPrice)) {
      setAmount(selectedVariation.variation_amount);
    }
  }, [selectedVariation]);

  useEffect(() => {
    setVerified(null);
  }, [serviceID, accountNumber, meterType, variationCode]);

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
          ? `Payment successful. Token / code: ${token}`
          : "Utility bill paid successfully."
      );
      setVerified(null);
      setAccountNumber("");
      setAmount("");
      await loadBills();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function onVerify() {
    if (!serviceID || !vtpassCategory || !accountNumber.trim()) return;
    setVerifying(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/utilities/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceID,
        vtpassCategory,
        accountNumber: accountNumber.trim(),
        meterType: categoryMeta?.requiresMeterType ? meterType : undefined,
      }),
    });
    const data = await res.json();
    setVerifying(false);
    if (!res.ok) {
      setError(data.error || "Verification failed.");
      return;
    }
    if (data.skipped) {
      setVerified({ customerName: null, address: null, accountNumber: accountNumber.trim() });
      setMessage("Ready to pay.");
      return;
    }
    setVerified({
      customerName: data.customerName,
      address: data.address,
      accountNumber: data.accountNumber,
    });
    setMessage(`Verified: ${data.customerName}`);
  }

  async function onPay(e: FormEvent) {
    e.preventDefault();
    if (!canPay || !serviceID || !vtpassCategory) return;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setError("Enter a valid phone number.");
      return;
    }

    setPaying(true);
    setError("");
    setMessage("");

    const createRes = await fetch("/api/portal/utilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceID,
        vtpassCategory,
        accountNumber: verified?.accountNumber || accountNumber.trim(),
        meterType: categoryMeta?.requiresMeterType ? meterType : undefined,
        variationCode: variationCode || undefined,
        customerName: verified?.customerName || undefined,
        customerAddress: verified?.address || undefined,
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
    }
  }

  async function onRequery(billId: string) {
    setRequeryingId(billId);
    setError("");
    const res = await fetch(`/api/portal/utilities/${billId}/requery`, {
      method: "POST",
    });
    const data = await res.json();
    setRequeryingId(null);
    if (!res.ok) {
      setError(data.error || "Requery failed.");
      return;
    }
    setMessage(
      data.requery?.purchasedCode
        ? `Updated: ${data.requery.purchasedCode}`
        : `Status: ${data.bill?.vtpassStatus || "updated"}`
    );
    await loadBills();
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
      {confirming ? <p className="text-sm text-muted">Confirming payment…</p> : null}

      <section className="grid sm:grid-cols-3 gap-3">
        <Reveal>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total paid</p>
            <p className="mt-2 text-2xl font-display font-semibold">{formatMoney(stats.totalPaid)}</p>
          </div>
        </Reveal>
        <Reveal delay={0.04}>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Completed</p>
            <p className="mt-2 text-2xl font-display font-semibold">{stats.paidCount}</p>
          </div>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="app-card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Pending</p>
            <p className="mt-2 text-2xl font-display font-semibold">{stats.pendingCount}</p>
          </div>
        </Reveal>
      </section>

      <Reveal>
        <section className="app-card overflow-hidden">
          <div className="px-5 py-6 sm:px-6 border-b border-border/60 bg-gradient-to-br from-brand/10 to-transparent">
            <h2 className="font-display text-lg font-semibold">Pay a bill</h2>
            <p className="text-sm text-muted mt-1">
              Electricity, cable, data, airtime, education, and more — pay securely in one place.
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.identifier}
                  type="button"
                  onClick={() => setVtpassCategory(c.identifier)}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                    vtpassCategory === c.identifier
                      ? "border-brand bg-brand/10 font-semibold"
                      : "border-border text-muted hover:border-brand/40"
                  }`}
                >
                  {c.meta?.label || c.name}
                </button>
              ))}
            </div>

            {categoryMeta ? (
              <p className="text-xs text-muted">{categoryMeta.description}</p>
            ) : null}

            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="Service provider"
                value={serviceID}
                onChange={setServiceID}
                options={services.map((s) => ({
                  value: s.serviceID,
                  label: s.name,
                }))}
                placeholder={loadingServices ? "Loading…" : "Choose provider"}
              />

              {variations.length > 0 ? (
                <Select
                  label="Plan / option"
                  value={variationCode}
                  onChange={setVariationCode}
                  options={variations.map((v) => ({
                    value: v.variation_code,
                    label: `${v.name}${
                      parseAmount(v.variation_amount) > 0
                        ? ` · ${formatMoney(parseAmount(v.variation_amount))}`
                        : ""
                    }`,
                  }))}
                  placeholder={loadingVariations ? "Loading…" : "Choose plan"}
                />
              ) : categoryMeta?.requiresMeterType ? (
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

            {selectedService?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedService.image}
                alt=""
                className="h-12 w-auto rounded object-contain"
              />
            ) : null}

            <div>
              <label className="block text-sm font-medium mb-1.5">
                {categoryMeta?.accountLabel || "Account number"}
              </label>
              <input
                className="app-input w-full"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder={
                  categoryMeta?.billersCodeIsPhone ? "08012345678" : "Enter account details"
                }
                inputMode={categoryMeta?.billersCodeIsPhone ? "tel" : "text"}
              />
            </div>

            {needsVerify ? (
              <button
                type="button"
                disabled={verifying || !accountNumber.trim()}
                onClick={() => void onVerify()}
                className="app-btn app-btn-secondary text-sm"
              >
                {verifying ? "Verifying…" : "Verify account"}
              </button>
            ) : null}

            {verified ? (
              <div className="rounded-lg border border-brand/25 bg-brand/5 p-3 text-sm">
                {verified.customerName ? (
                  <p className="font-semibold">{verified.customerName}</p>
                ) : null}
                <p className="text-muted">{verified.accountNumber}</p>
                {verified.address ? (
                  <p className="text-xs text-muted mt-1">{verified.address}</p>
                ) : null}
              </div>
            ) : null}

            {(canPay || !needsVerify) && (
              <form onSubmit={onPay} className="space-y-4 border-t border-border/60 pt-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Phone (receipt)</label>
                  <input
                    className="app-input w-full"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="08012345678"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Amount (NGN)</label>
                  <input
                    type="number"
                    min={parseAmount(selectedService?.minimium_amount) || 1}
                    className="app-input w-full"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    readOnly={amountLocked}
                    required
                  />
                  {selectedService?.minimium_amount ? (
                    <p className="text-xs text-muted mt-1">
                      Min {formatMoney(parseAmount(selectedService.minimium_amount))}
                      {selectedService.maximum_amount
                        ? ` · Max ${formatMoney(parseAmount(selectedService.maximum_amount))}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <button
                  type="submit"
                  disabled={paying || (needsVerify && !verified)}
                  className="app-btn app-btn-primary text-sm"
                >
                  {paying ? "Redirecting to checkout…" : "Pay bill"}
                </button>
              </form>
            )}
          </div>
        </section>
      </Reveal>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Payment history</h2>
        {bills.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description="Electricity, cable, data, airtime, education pins, and more."
          />
        ) : (
          <Stagger className="grid gap-3">
            {bills.map((b) => (
              <StaggerItem key={b.id}>
                <article className="app-card p-4 sm:p-5 flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold capitalize">
                        {b.category.replace("_", " ")} · {b.provider}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusClass(b.status)}`}
                      >
                        {b.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      {formatMoney(b.amount, b.currency)} · {b.accountNumber}
                      {b.variationName ? ` · ${b.variationName}` : ""}
                    </p>
                    {b.purchaseToken ? (
                      <p className="text-xs font-mono text-brand-dark break-all">
                        Code: {b.purchaseToken}
                      </p>
                    ) : null}
                    {b.vtpassStatus ? (
                      <p className="text-xs text-muted">Status: {b.vtpassStatus}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {b.vtpassRequestId && b.status === "paid" && !b.purchaseToken ? (
                      <button
                        type="button"
                        disabled={requeryingId === b.id}
                        onClick={() => void onRequery(b.id)}
                        className="app-btn app-btn-secondary text-xs"
                      >
                        {requeryingId === b.id ? "Checking…" : "Check status"}
                      </button>
                    ) : null}
                    {b.status === "pending" ? (
                      <button
                        type="button"
                        disabled={paying}
                        onClick={() => {
                          void (async () => {
                            setPaying(true);
                            const res = await fetch(`/api/portal/utilities/${b.id}/pay`, {
                              method: "POST",
                            });
                            const data = await res.json();
                            setPaying(false);
                            if (res.ok && data.authorization_url) {
                              window.location.href = data.authorization_url;
                            }
                          })();
                        }}
                        className="app-btn app-btn-primary text-xs"
                      >
                        Complete payment
                      </button>
                    ) : null}
                  </div>
                </article>
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>
    </div>
  );
}
