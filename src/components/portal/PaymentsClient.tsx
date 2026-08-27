"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Reveal } from "@/components/motion/Motion";
import EmptyState from "@/components/ui/EmptyState";
import Select from "@/components/ui/Select";
import { StatCardsSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { useActiveProfile } from "@/hooks/useActiveProfile";

type PaymentRow = {
  id: string;
  leaseId: string | null;
  amount: number;
  currency: string;
  status: string;
  providerRef: string | null;
  receiptUrl: string | null;
  receiptNumber: string | null;
  paidAt: string | null;
  createdAt: string;
};

type WalletTx = {
  id: string;
  type: string;
  direction: string;
  amount: number;
  currency: string;
  balanceAfter: number;
  status: string;
  reference: string;
  description: string;
  paymentId: string | null;
  createdAt: string;
};

type WithdrawalRow = {
  id: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  bankName: string;
  accountNumberLast4: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
};

type WalletData = {
  id: string;
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  totalCredited: number;
  totalWithdrawn: number;
  bankDetails: {
    bankName: string;
    accountName: string;
    accountNumberLast4: string;
    bankCode: string;
  } | null;
};

type AgreementOption = {
  id: string;
  status: string;
  rentAmount: number;
  currency: string;
  tenantProfileId: string;
  listing: { title: string } | null;
};

type BankOption = { code: string; name: string };

type ReceiptData = {
  receiptNumber: string | null;
  paymentId: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  providerRef: string | null;
  listing: { title: string; address?: { city?: string; state?: string } } | null;
  payee: { name: string; type: string } | null;
  lease: { paymentPeriod: string } | null;
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
  if (status === "successful" || status === "completed") {
    return "bg-teal/15 text-brand-dark border-teal/30";
  }
  if (status === "pending" || status === "processing") {
    return "bg-brand/10 text-brand-dark border-brand/25";
  }
  if (status === "failed") return "bg-danger/10 text-danger border-danger/30";
  return "bg-surface text-muted border-border";
}

function txLabel(type: string) {
  if (type === "rent_credit") return "Rent received";
  if (type === "rent_payment") return "Rent paid";
  if (type === "withdrawal") return "Withdrawal";
  if (type === "withdrawal_refund") return "Withdrawal refund";
  return type.replace(/_/g, " ");
}

export default function PaymentsClient() {
  const searchParams = useSearchParams();
  const { profile, isLandlordLike, isTenantLike, loading: profileLoading } =
    useActiveProfile();

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [limits, setLimits] = useState({ minWithdrawal: 1000, withdrawalFee: 0 });

  const [tenantLeases, setTenantLeases] = useState<AgreementOption[]>([]);
  const [leaseId, setLeaseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [savingBank, setSavingBank] = useState(false);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [showBankForm, setShowBankForm] = useState(false);

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  const receiptId = searchParams.get("receipt");

  const loadWallet = useCallback(async (profileId: string) => {
    const res = await fetch(`/api/portal/wallet?profileId=${encodeURIComponent(profileId)}`);
    const data = await res.json();
    if (!res.ok) return;
    setWallet(data.wallet || null);
    setTransactions(data.transactions || []);
    setWithdrawals(data.withdrawals || []);
    setLimits(data.limits || { minWithdrawal: 1000, withdrawalFee: 0 });
  }, []);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError("");
    const [pRes, aRes] = await Promise.all([
      fetch("/api/portal/payments"),
      fetch("/api/portal/agreements"),
    ]);
    const pData = await pRes.json();
    const aData = await aRes.json();
    setLoading(false);
    if (!pRes.ok) {
      setError(pData.error || "Unable to load payments.");
      return;
    }
    setRows(pData.payments || []);

    const agreements = (aData.agreements || []) as AgreementOption[];
    const active = agreements.filter((a) => a.status === "active");
    const mineAsTenant = active.filter((a) => a.tenantProfileId === profile.id);
    setTenantLeases(mineAsTenant);
    if (!leaseId && mineAsTenant[0]?.id) setLeaseId(mineAsTenant[0].id);

    await loadWallet(profile.id);
  }, [leaseId, profile?.id, loadWallet]);

  useEffect(() => {
    if (profileLoading) return;
    void load();
  }, [profileLoading, profile?.id, load]);

  useEffect(() => {
    if (!isLandlordLike) return;
    void (async () => {
      const res = await fetch("/api/portal/wallet/bank");
      const data = await res.json();
      if (res.ok) setBanks(data.banks || []);
    })();
  }, [isLandlordLike]);

  useEffect(() => {
    const paid = searchParams.get("paid");
    const mockRef = searchParams.get("mock_ref");
    const ref = mockRef || searchParams.get("reference");
    if (paid === "1" && ref) {
      void (async () => {
        setVerifying(true);
        setError("");
        const res = await fetch(
          `/api/portal/payments/verify?reference=${encodeURIComponent(ref)}`
        );
        const data = await res.json();
        setVerifying(false);
        if (!res.ok) {
          setError(data.error || "Could not verify payment.");
          return;
        }
        setMessage("Payment verified and wallet updated.");
        await load();
      })();
    }
  }, [searchParams, load]);

  useEffect(() => {
    if (!receiptId) {
      setReceipt(null);
      return;
    }
    void (async () => {
      setReceiptLoading(true);
      const res = await fetch(`/api/portal/payments/${receiptId}/receipt`);
      const data = await res.json();
      setReceiptLoading(false);
      if (res.ok) setReceipt(data.receipt);
    })();
  }, [receiptId]);

  const selectedBank = useMemo(
    () => banks.find((b) => b.code === bankCode) || null,
    [banks, bankCode]
  );

  const tenantTotalPaid = useMemo(
    () =>
      transactions
        .filter((tx) => tx.type === "rent_payment" && tx.status === "completed")
        .reduce((sum, tx) => sum + tx.amount, 0),
    [transactions]
  );

  async function onPay(e: FormEvent) {
    e.preventDefault();
    if (!leaseId) {
      setError("Select an active lease.");
      return;
    }
    setPaying(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leaseId }),
    });
    const data = await res.json();
    setPaying(false);
    if (!res.ok) {
      setError(data.error || "Could not start payment.");
      return;
    }
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    }
  }

  async function onSaveBank(e: FormEvent) {
    e.preventDefault();
    if (!profile?.id || !selectedBank) {
      setError("Select a bank and enter account details.");
      return;
    }
    setSavingBank(true);
    setError("");
    const res = await fetch("/api/portal/wallet/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: profile.id,
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
        accountNumber,
        accountName,
      }),
    });
    const data = await res.json();
    setSavingBank(false);
    if (!res.ok) {
      setError(data.error || "Could not save bank account.");
      return;
    }
    setMessage("Payout bank account saved.");
    setShowBankForm(false);
    setAccountNumber("");
    await load();
  }

  async function onWithdraw(e: FormEvent) {
    e.preventDefault();
    if (!profile?.id) return;
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setError("Enter a valid withdrawal amount.");
      return;
    }
    setWithdrawing(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/wallet/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id, amount }),
    });
    const data = await res.json();
    setWithdrawing(false);
    if (!res.ok) {
      setError(data.error || "Withdrawal failed.");
      return;
    }
    setMessage("Withdrawal submitted successfully.");
    setWithdrawAmount("");
    await load();
  }

  if (loading || profileLoading) {
    return (
      <div className="space-y-6">
        <StatCardsSkeleton count={3} />
        <TableSkeleton rows={4} />
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
      {verifying ? (
        <p className="text-sm text-muted">Verifying payment…</p>
      ) : null}

      {wallet ? (
        <section className="grid sm:grid-cols-3 gap-3">
          <Reveal>
            <div className="app-card p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Available balance
              </p>
              <p className="mt-2 text-2xl font-display font-semibold">
                {formatMoney(wallet.availableBalance, wallet.currency)}
              </p>
              {isLandlordLike ? (
                <p className="mt-1 text-xs text-muted">Ready to withdraw</p>
              ) : (
                <p className="mt-1 text-xs text-muted">Payment activity wallet</p>
              )}
            </div>
          </Reveal>
          <Reveal delay={0.04}>
            <div className="app-card p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {isLandlordLike ? "Total received" : "Total paid"}
              </p>
              <p className="mt-2 text-2xl font-display font-semibold">
                {formatMoney(
                  isLandlordLike ? wallet.totalCredited : tenantTotalPaid,
                  wallet.currency
                )}
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="app-card p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {isLandlordLike ? "Total withdrawn" : "Transactions"}
              </p>
              <p className="mt-2 text-2xl font-display font-semibold">
                {isLandlordLike
                  ? formatMoney(wallet.totalWithdrawn, wallet.currency)
                  : transactions.length}
              </p>
            </div>
          </Reveal>
        </section>
      ) : null}

      {receiptId ? (
        <Reveal>
          <section className="app-card p-5 sm:p-6 max-w-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Payment receipt
                </p>
                <h2 className="font-display text-xl font-semibold mt-1">
                  {receiptLoading
                    ? "Loading…"
                    : receipt?.receiptNumber || "Receipt"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                className="app-btn app-btn-secondary text-xs"
              >
                Print
              </button>
            </div>
            {receipt ? (
              <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Amount</dt>
                  <dd className="font-semibold">
                    {formatMoney(receipt.amount, receipt.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Paid on</dt>
                  <dd>
                    {receipt.paidAt
                      ? new Date(receipt.paidAt).toLocaleString()
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Property</dt>
                  <dd>{receipt.listing?.title || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Landlord</dt>
                  <dd>{receipt.payee?.name || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted">Reference</dt>
                  <dd className="font-mono text-xs">{receipt.providerRef || "—"}</dd>
                </div>
              </dl>
            ) : receiptLoading ? null : (
              <p className="text-sm text-muted">Receipt not available.</p>
            )}
          </section>
        </Reveal>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        {isTenantLike ? (
          <Reveal>
            <form onSubmit={onPay} className="app-card overflow-hidden h-fit">
              <div className="px-5 py-6 border-b border-border/60 bg-gradient-to-br from-brand/10 to-transparent">
                <h2 className="font-display text-lg font-semibold">Pay rent</h2>
                <p className="text-sm text-muted mt-1">
                  Secure checkout — funds go to your landlord&apos;s wallet.
                </p>
              </div>
              <div className="p-5 space-y-4">
                {tenantLeases.length === 0 ? (
                  <p className="text-sm text-muted">
                    No active leases on this profile. Complete an agreement first.
                  </p>
                ) : (
                  <>
                    <Select
                      label="Active lease"
                      value={leaseId}
                      onChange={setLeaseId}
                      options={tenantLeases.map((l) => ({
                        value: l.id,
                        label: `${l.listing?.title || "Lease"} · ${formatMoney(l.rentAmount, l.currency)}`,
                      }))}
                    />
                    <button
                      type="submit"
                      disabled={paying}
                      className="app-btn app-btn-primary text-sm w-full sm:w-auto"
                    >
                      {paying ? "Redirecting to checkout…" : "Pay rent"}
                    </button>
                  </>
                )}
              </div>
            </form>
          </Reveal>
        ) : null}

        {isLandlordLike ? (
          <Reveal>
            <div className="app-card overflow-hidden h-fit">
              <div className="px-5 py-6 border-b border-border/60 bg-gradient-to-br from-teal/10 to-transparent">
                <h2 className="font-display text-lg font-semibold">Withdraw funds</h2>
                <p className="text-sm text-muted mt-1">
                  Transfer available balance to your bank account.
                </p>
              </div>
              <div className="p-5 space-y-4">
                {wallet?.bankDetails ? (
                  <div className="rounded-lg border border-border/60 bg-surface/40 p-3 text-sm">
                    <p className="font-medium">{wallet.bankDetails.accountName}</p>
                    <p className="text-muted text-xs mt-1">
                      {wallet.bankDetails.bankName} · {wallet.bankDetails.accountNumberLast4}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowBankForm((v) => !v)}
                      className="text-xs text-brand mt-2 hover:underline"
                    >
                      {showBankForm ? "Cancel change" : "Change bank account"}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    Add a bank account to receive payouts.
                  </p>
                )}

                {showBankForm || !wallet?.bankDetails ? (
                  <form onSubmit={onSaveBank} className="space-y-3">
                    <Select
                      label="Bank"
                      value={bankCode}
                      onChange={setBankCode}
                      options={banks.map((b) => ({ value: b.code, label: b.name }))}
                      placeholder="Select bank"
                    />
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Account number
                      </label>
                      <input
                        className="app-input w-full"
                        inputMode="numeric"
                        value={accountNumber}
                        onChange={(e) =>
                          setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Account name
                      </label>
                      <input
                        className="app-input w-full"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingBank}
                      className="app-btn app-btn-secondary text-sm"
                    >
                      {savingBank ? "Saving…" : "Save bank account"}
                    </button>
                  </form>
                ) : null}

                {wallet?.bankDetails ? (
                  <form onSubmit={onWithdraw} className="space-y-3 border-t border-border/60 pt-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">
                        Amount (min {formatMoney(limits.minWithdrawal)})
                      </label>
                      <input
                        type="number"
                        min={limits.minWithdrawal}
                        className="app-input w-full"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder={String(limits.minWithdrawal)}
                        required
                      />
                      {limits.withdrawalFee > 0 ? (
                        <p className="text-xs text-muted mt-1">
                          Fee: {formatMoney(limits.withdrawalFee)}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="submit"
                      disabled={withdrawing || (wallet?.availableBalance || 0) < limits.minWithdrawal}
                      className="app-btn app-btn-primary text-sm w-full sm:w-auto"
                    >
                      {withdrawing ? "Processing…" : "Withdraw to bank"}
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </Reveal>
        ) : null}
      </div>

      <section className="space-y-4">
        <Reveal>
          <h2 className="font-display text-lg font-semibold">Transaction log</h2>
          <p className="text-sm text-muted">
            Wallet movements with balance after each entry.
          </p>
        </Reveal>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted">No wallet transactions yet.</p>
        ) : (
          <ul className="space-y-2">
            {transactions.map((tx) => (
              <li key={tx.id} className="app-card p-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{txLabel(tx.type)}</p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusClass(tx.status)}`}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">{tx.description}</p>
                  <p className="text-xs text-muted font-mono mt-0.5">{tx.reference}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.direction === "in" ? "text-brand-dark" : "text-foreground"}`}>
                    {tx.direction === "in" ? "+" : "−"}
                    {formatMoney(tx.amount, tx.currency)}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Bal {formatMoney(tx.balanceAfter, tx.currency)}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(tx.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isLandlordLike && withdrawals.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Withdrawal history</h2>
          <ul className="space-y-2">
            {withdrawals.map((w) => (
              <li key={w.id} className="app-card p-4 flex flex-wrap justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {formatMoney(w.netAmount, w.currency)} → {w.bankName}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {w.accountNumberLast4} · {new Date(w.createdAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider h-fit ${statusClass(w.status)}`}
                >
                  {w.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <Reveal>
          <h2 className="font-display text-lg font-semibold">Rent payments</h2>
        </Reveal>
        {rows.length === 0 ? (
          <EmptyState
            title="No payments yet"
            description={
              isLandlordLike
                ? "Rent payments from tenants will appear here once collected."
                : "Rent payments you make will show up here."
            }
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((p) => (
              <li
                key={p.id}
                className="app-card p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {formatMoney(p.amount, p.currency)}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusClass(p.status)}`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {p.receiptNumber ? `${p.receiptNumber} · ` : ""}
                    {p.providerRef ? `Ref ${p.providerRef}` : "Online payment"}
                    {p.paidAt
                      ? ` · ${new Date(p.paidAt).toLocaleString()}`
                      : ` · ${new Date(p.createdAt).toLocaleString()}`}
                  </p>
                </div>
                {p.status === "successful" ? (
                  <a
                    href={`/portal/payments?receipt=${p.id}`}
                    className="app-btn app-btn-secondary text-xs"
                  >
                    Receipt
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
