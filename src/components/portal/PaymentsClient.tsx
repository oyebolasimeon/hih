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
  paidAmount: number | null;
  currency: string;
  bankName: string;
  accountName: string;
  accountNumberLast4: string;
  payoutProvider: string;
  status: string;
  providerRef: string | null;
  sessionId: string | null;
  transferReceiptUrl: string | null;
  hihReceiptNumber: string | null;
  disputeStatus: string;
  disputeReason: string | null;
  createdAt: string;
  completedAt: string | null;
};

type WalletData = {
  id: string;
  currency: string;
  availableBalance: number;
  lockedBalance: number;
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

type RentLockRow = {
  id: string;
  leaseId: string;
  amount: number;
  currency: string;
  rentPeriodStart: string;
  rentPeriodEnd: string;
  canApply: boolean;
  status: string;
};

type RentStatus = {
  payablePeriod: {
    periodStart: string;
    periodEnd: string;
    label: string;
    paid: boolean;
    expired: boolean;
  };
  canPayRent: boolean;
  canLockNext: boolean;
  nextPeriod: { label: string; periodStart: string } | null;
  nextLock: RentLockRow | null;
  activeLocks: RentLockRow[];
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
  purpose: string;
  purposeLabel: string;
  amount: number;
  currency: string;
  grossAmount: number;
  platformFeeAmount: number;
  agreementFeeAmount: number;
  netPayeeAmount: number;
  paidAt: string | null;
  providerRef: string | null;
  receiptPdfUrl: string | null;
  rentPeriodLabel: string | null;
  breakdown: Array<{ label: string; amount: number; kind: string }>;
  listing: { title: string; address?: string } | null;
  payee: { name: string; type: string } | null;
  payer: { name: string } | null;
  signatures: Array<{ role: string; name: string; signedAt?: string | null }>;
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
  if (type === "wallet_deposit") return "Wallet deposit";
  if (type === "rent_lock") return "Reserved for rent";
  if (type === "rent_unlock") return "Released reserve";
  if (type === "rent_lock_apply") return "Rent from reserve";
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
  const [limits, setLimits] = useState({
    minWithdrawal: 1000,
    withdrawalFee: 50,
    payoutProvider: "paystack" as "paystack" | "manual",
  });
  const [rentLocks, setRentLocks] = useState<RentLockRow[]>([]);
  const [rentStatus, setRentStatus] = useState<RentStatus | null>(null);

  const [tenantLeases, setTenantLeases] = useState<AgreementOption[]>([]);
  const [leaseId, setLeaseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [paying, setPaying] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [locking, setLocking] = useState(false);
  const [unlockingId, setUnlockingId] = useState("");
  const [applyingId, setApplyingId] = useState("");

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [lockAmount, setLockAmount] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [showBankForm, setShowBankForm] = useState(false);
  const [disputeId, setDisputeId] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [disputing, setDisputing] = useState(false);

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
    setRentLocks(data.rentLocks || []);
    setLimits(
      data.limits || {
        minWithdrawal: 1000,
        withdrawalFee: 50,
        payoutProvider: "paystack",
      }
    );
  }, []);

  const loadRentStatus = useCallback(async (selectedLeaseId: string) => {
    if (!selectedLeaseId) {
      setRentStatus(null);
      return;
    }
    const res = await fetch(
      `/api/portal/payments/rent-status?leaseId=${encodeURIComponent(selectedLeaseId)}`
    );
    const data = await res.json();
    if (res.ok) setRentStatus(data.rentStatus || null);
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
    if (!isLandlordLike && !isTenantLike) return;
    void (async () => {
      const res = await fetch("/api/portal/wallet/bank");
      const data = await res.json();
      if (res.ok) setBanks(data.banks || []);
    })();
  }, [isLandlordLike, isTenantLike]);

  useEffect(() => {
    if (!isTenantLike || !leaseId) return;
    void loadRentStatus(leaseId);
  }, [isTenantLike, leaseId, loadRentStatus]);

  useEffect(() => {
    const paid = searchParams.get("paid");
    const deposit = searchParams.get("deposit");
    const mockRef = searchParams.get("mock_ref");
    const ref = mockRef || searchParams.get("reference");
    if ((paid === "1" || deposit === "1") && ref) {
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
        setMessage(
          deposit === "1"
            ? "Deposit confirmed — funds added to your wallet."
            : "Payment verified and wallet updated."
        );
        await load();
        if (leaseId) await loadRentStatus(leaseId);
      })();
    }
  }, [searchParams, load, leaseId, loadRentStatus]);

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

  const selectedLease = useMemo(
    () => tenantLeases.find((l) => l.id === leaseId) || null,
    [tenantLeases, leaseId]
  );

  async function onDeposit(e: FormEvent) {
    e.preventDefault();
    if (!profile?.id) return;
    const amount = Number(depositAmount);
    if (!amount || amount <= 0) {
      setError("Enter a valid deposit amount.");
      return;
    }
    setDepositing(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/wallet/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id, amount }),
    });
    const data = await res.json();
    setDepositing(false);
    if (!res.ok) {
      setError(data.error || "Could not start deposit.");
      return;
    }
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    }
  }

  async function onLock(e: FormEvent) {
    e.preventDefault();
    if (!profile?.id || !leaseId) return;
    setLocking(true);
    setError("");
    setMessage("");
    const amount = lockAmount ? Number(lockAmount) : undefined;
    const res = await fetch("/api/portal/wallet/lock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: profile.id,
        leaseId,
        ...(amount && amount > 0 ? { amount } : {}),
      }),
    });
    const data = await res.json();
    setLocking(false);
    if (!res.ok) {
      setError(data.error || "Could not lock funds.");
      return;
    }
    setMessage("Funds reserved for your next rent period.");
    setLockAmount("");
    await load();
    await loadRentStatus(leaseId);
  }

  async function onUnlock(lockId: string) {
    if (!profile?.id) return;
    setUnlockingId(lockId);
    setError("");
    setMessage("");
    const res = await fetch(
      `/api/portal/wallet/lock?lockId=${encodeURIComponent(lockId)}&profileId=${encodeURIComponent(profile.id)}`,
      { method: "DELETE" }
    );
    const data = await res.json();
    setUnlockingId("");
    if (!res.ok) {
      setError(data.error || "Could not unlock funds.");
      return;
    }
    setMessage("Reserved funds released to your available balance.");
    await load();
    if (leaseId) await loadRentStatus(leaseId);
  }

  async function onApplyLock(lockId: string) {
    if (!profile?.id) return;
    setApplyingId(lockId);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/wallet/lock", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id, lockId }),
    });
    const data = await res.json();
    setApplyingId("");
    if (!res.ok) {
      setError(data.error || "Could not apply reserved funds.");
      return;
    }
    setMessage("Reserved funds applied — rent paid to your landlord.");
    await load();
    if (leaseId) await loadRentStatus(leaseId);
  }

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
    setMessage(
      data.message ||
        (data.mode === "manual"
          ? "Withdrawal submitted. Our team will process your bank transfer manually."
          : "Withdrawal submitted successfully.")
    );
    setWithdrawAmount("");
    await load();
  }

  async function onDispute(e: FormEvent) {
    e.preventDefault();
    if (!disputeId) return;
    setDisputing(true);
    setError("");
    const res = await fetch(`/api/portal/wallet/withdrawals/${disputeId}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: disputeReason }),
    });
    const data = await res.json();
    setDisputing(false);
    if (!res.ok) {
      setError(data.error || "Could not open dispute.");
      return;
    }
    setMessage("Dispute submitted. Our team will review your withdrawal.");
    setDisputeId("");
    setDisputeReason("");
    await load();
  }

  const withdrawPreviewNet = (() => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) return null;
    return Math.max(0, amount - limits.withdrawalFee);
  })();

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
                <p className="mt-1 text-xs text-muted">
                  {wallet.lockedBalance > 0
                    ? `${formatMoney(wallet.lockedBalance, wallet.currency)} reserved for rent`
                    : "Deposit, reserve, or withdraw"}
                </p>
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
              <div className="space-y-5">
                <dl className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-muted">Purpose</dt>
                    <dd className="font-semibold">{receipt.purposeLabel}</dd>
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
                    <dt className="text-muted">Payer</dt>
                    <dd>{receipt.payer?.name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Payee</dt>
                    <dd>{receipt.payee?.name || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Property</dt>
                    <dd>{receipt.listing?.title || "—"}</dd>
                  </div>
                  {receipt.rentPeriodLabel ? (
                    <div>
                      <dt className="text-muted">Rent period</dt>
                      <dd>{receipt.rentPeriodLabel}</dd>
                    </div>
                  ) : null}
                </dl>

                <div className="rounded-lg border border-border/60 overflow-hidden">
                  <div className="px-4 py-3 bg-gradient-to-r from-brand/10 to-teal/10 border-b border-border/60">
                    <p className="text-sm font-semibold">Cost breakdown</p>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {receipt.breakdown.map((line) => (
                      <li
                        key={line.label}
                        className="px-4 py-3 flex items-center justify-between text-sm"
                      >
                        <span
                          className={
                            line.kind === "total" ? "font-semibold" : "text-muted"
                          }
                        >
                          {line.label}
                        </span>
                        <span
                          className={
                            line.kind === "total" ? "font-display font-semibold" : ""
                          }
                        >
                          {formatMoney(line.amount, receipt.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {receipt.signatures.length > 0 ? (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {receipt.signatures.map((sig) => (
                      <div
                        key={sig.role}
                        className="rounded-lg border border-border/60 p-3 bg-surface/40"
                      >
                        <p className="text-xs uppercase tracking-wider text-muted">
                          {sig.role}
                        </p>
                        <p className="font-medium mt-1">{sig.name}</p>
                        {sig.signedAt ? (
                          <p className="text-xs text-muted mt-1">
                            {new Date(sig.signedAt).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {receipt.receiptPdfUrl ? (
                    <a
                      href={receipt.receiptPdfUrl}
                      className="app-btn app-btn-primary text-xs"
                    >
                      Download PDF
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="app-btn app-btn-secondary text-xs"
                  >
                    Print
                  </button>
                </div>

                <p className="text-xs text-muted font-mono">
                  Ref {receipt.providerRef || "—"}
                </p>
              </div>
            ) : receiptLoading ? null : (
              <p className="text-sm text-muted">Receipt not available.</p>
            )}
          </section>
        </Reveal>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        {isTenantLike ? (
          <Reveal>
            <div className="space-y-6">
              <form onSubmit={onPay} className="app-card overflow-hidden h-fit">
                <div className="px-5 py-6 border-b border-border/60 bg-gradient-to-br from-brand/10 to-transparent">
                  <h2 className="font-display text-lg font-semibold">Pay rent</h2>
                  <p className="text-sm text-muted mt-1">
                    One payment per rent period. Reserve early for the next period below.
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
                      {rentStatus ? (
                        <div className="rounded-lg border border-border/60 bg-surface/40 p-3 text-sm space-y-1">
                          <p>
                            <span className="text-muted">Current period:</span>{" "}
                            {rentStatus.payablePeriod.label}
                          </p>
                          {rentStatus.payablePeriod.paid ? (
                            <p className="text-brand-dark font-medium">
                              Paid for this period
                            </p>
                          ) : rentStatus.payablePeriod.expired ? (
                            <p className="text-danger font-medium">Overdue — payment required</p>
                          ) : (
                            <p className="text-muted">Due before period ends</p>
                          )}
                        </div>
                      ) : null}
                      <button
                        type="submit"
                        disabled={paying || rentStatus?.canPayRent === false}
                        className="app-btn app-btn-primary text-sm w-full sm:w-auto disabled:opacity-50"
                      >
                        {paying
                          ? "Redirecting to checkout…"
                          : rentStatus?.canPayRent === false
                            ? "Rent already paid this period"
                            : `Pay ${formatMoney(selectedLease?.rentAmount || 0, selectedLease?.currency)}`}
                      </button>
                    </>
                  )}
                </div>
              </form>

              <div className="app-card overflow-hidden h-fit">
                <div className="px-5 py-6 border-b border-border/60 bg-gradient-to-br from-teal/10 to-transparent">
                  <h2 className="font-display text-lg font-semibold">Wallet &amp; early rent</h2>
                  <p className="text-sm text-muted mt-1">
                    Deposit funds, lock them for the next rent period, or unlock and withdraw.
                  </p>
                </div>
                <div className="p-5 space-y-5">
                  <form onSubmit={onDeposit} className="space-y-3">
                    <p className="text-sm font-medium">Deposit to wallet</p>
                    <input
                      type="number"
                      min={1000}
                      className="app-input w-full"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Amount"
                    />
                    <button
                      type="submit"
                      disabled={depositing}
                      className="app-btn app-btn-secondary text-sm"
                    >
                      {depositing ? "Starting deposit…" : "Deposit via checkout"}
                    </button>
                  </form>

                  {leaseId && rentStatus?.canLockNext ? (
                    <form onSubmit={onLock} className="space-y-3 border-t border-border/60 pt-4">
                      <p className="text-sm font-medium">Reserve for next period</p>
                      {rentStatus.nextPeriod ? (
                        <p className="text-xs text-muted">{rentStatus.nextPeriod.label}</p>
                      ) : null}
                      <input
                        type="number"
                        min={1000}
                        className="app-input w-full"
                        value={lockAmount}
                        onChange={(e) => setLockAmount(e.target.value)}
                        placeholder={
                          selectedLease
                            ? String(selectedLease.rentAmount)
                            : "Amount (defaults to rent)"
                        }
                      />
                      <button
                        type="submit"
                        disabled={locking || (wallet?.availableBalance || 0) <= 0}
                        className="app-btn app-btn-secondary text-sm"
                      >
                        {locking ? "Locking…" : "Lock funds for next rent"}
                      </button>
                    </form>
                  ) : null}

                  {(rentLocks.length > 0 || (rentStatus?.activeLocks.length || 0) > 0) ? (
                    <div className="space-y-2 border-t border-border/60 pt-4">
                      <p className="text-sm font-medium">Reserved funds</p>
                      {(rentStatus?.activeLocks || rentLocks).map((lock) => (
                        <div
                          key={lock.id}
                          className="rounded-lg border border-border/60 bg-surface/40 p-3 text-sm flex flex-wrap items-center justify-between gap-2"
                        >
                          <div>
                            <p className="font-medium">
                              {formatMoney(lock.amount, lock.currency)}
                            </p>
                            <p className="text-xs text-muted mt-0.5">
                              {new Date(lock.rentPeriodStart).toLocaleDateString()} –{" "}
                              {new Date(lock.rentPeriodEnd).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {lock.canApply ? (
                              <button
                                type="button"
                                onClick={() => onApplyLock(lock.id)}
                                disabled={applyingId === lock.id}
                                className="app-btn app-btn-primary text-xs"
                              >
                                {applyingId === lock.id ? "Applying…" : "Pay rent"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => onUnlock(lock.id)}
                              disabled={unlockingId === lock.id}
                              className="app-btn app-btn-secondary text-xs"
                            >
                              {unlockingId === lock.id ? "Unlocking…" : "Unlock"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="border-t border-border/60 pt-4 space-y-3">
                    <p className="text-sm font-medium">Withdraw available balance</p>
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
                        Add a bank account to withdraw unlocked funds.
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
                      <form onSubmit={onWithdraw} className="space-y-3">
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
                            placeholder={`Min ${limits.minWithdrawal}`}
                            required
                          />
                          {limits.withdrawalFee > 0 ? (
                            <p className="text-xs text-muted mt-1">
                              Fee: {formatMoney(limits.withdrawalFee)} (deducted from
                              amount)
                              {withdrawPreviewNet != null
                                ? ` · You receive ${formatMoney(withdrawPreviewNet)}`
                                : ""}
                            </p>
                          ) : null}
                          {limits.payoutProvider === "manual" ? (
                            <p className="text-xs text-muted mt-1">
                              Transfers are processed manually by our team. You will
                              receive bank and House In Hand receipts when complete.
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="submit"
                          disabled={
                            withdrawing ||
                            (wallet?.availableBalance || 0) < limits.minWithdrawal
                          }
                          className="app-btn app-btn-primary text-sm"
                        >
                          {withdrawing ? "Processing…" : "Withdraw to bank"}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
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
                          Fee: {formatMoney(limits.withdrawalFee)} (deducted from
                          amount)
                          {withdrawPreviewNet != null
                            ? ` · You receive ${formatMoney(withdrawPreviewNet)}`
                            : ""}
                        </p>
                      ) : null}
                      {limits.payoutProvider === "manual" ? (
                        <p className="text-xs text-muted mt-1">
                          Transfers are processed manually. Status will show as
                          processing until our team completes the bank transfer.
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

      {withdrawals.length > 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Withdrawal history</h2>
          <ul className="space-y-2">
            {withdrawals.map((w) => (
              <li key={w.id} className="app-card p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {formatMoney(w.amount, w.currency)} requested →{" "}
                      {formatMoney(w.paidAmount ?? w.netAmount, w.currency)} to{" "}
                      {w.bankName}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {w.accountName} · {w.accountNumberLast4} · Fee{" "}
                      {formatMoney(w.fee, w.currency)}
                    </p>
                    <p className="text-xs text-muted">
                      {w.providerRef ? `${w.providerRef} · ` : ""}
                      {new Date(w.createdAt).toLocaleString()}
                      {w.payoutProvider === "manual" ? " · Manual transfer" : ""}
                    </p>
                    {w.status === "pending" || w.status === "processing" ? (
                      <p className="text-xs text-brand-dark mt-2">
                        {w.payoutProvider === "manual"
                          ? "Your withdrawal is being processed. We will notify you when the transfer is complete."
                          : "Your withdrawal is being processed."}
                      </p>
                    ) : null}
                    {w.status === "completed" && w.sessionId ? (
                      <p className="text-xs text-muted mt-1">
                        Session ID: {w.sessionId}
                      </p>
                    ) : null}
                    {w.disputeStatus === "open" ? (
                      <p className="text-xs text-danger mt-1">
                        Dispute open — our team is reviewing
                      </p>
                    ) : null}
                    {w.disputeStatus === "resolved" ? (
                      <p className="text-xs text-muted mt-1">Dispute resolved</p>
                    ) : null}
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider h-fit ${statusClass(w.status)}`}
                  >
                    {w.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {w.status === "completed" && w.transferReceiptUrl ? (
                    <a
                      href={w.transferReceiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="app-btn app-btn-secondary text-xs"
                    >
                      Bank receipt
                    </a>
                  ) : null}
                  {w.status === "completed" ? (
                    <a
                      href={`/api/portal/wallet/withdrawals/${w.id}/receipt`}
                      className="app-btn app-btn-secondary text-xs"
                    >
                      HIH receipt
                    </a>
                  ) : null}
                  {w.status === "completed" &&
                  w.disputeStatus !== "open" &&
                  w.disputeStatus !== "resolved" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDisputeId(w.id);
                        setDisputeReason("");
                      }}
                      className="app-btn app-btn-secondary text-xs"
                    >
                      Open dispute
                    </button>
                  ) : null}
                </div>
                {disputeId === w.id ? (
                  <form onSubmit={onDispute} className="border-t border-border/60 pt-3 space-y-2">
                    <label className="block text-sm font-medium">
                      Describe the issue
                    </label>
                    <textarea
                      className="app-input w-full min-h-[80px]"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Explain why you are disputing this withdrawal…"
                      required
                      minLength={10}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={disputing}
                        className="app-btn app-btn-primary text-xs"
                      >
                        {disputing ? "Submitting…" : "Submit dispute"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisputeId("")}
                        className="app-btn app-btn-secondary text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : null}
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
                  <div className="flex gap-2">
                    <a
                      href={`/portal/payments?receipt=${p.id}`}
                      className="app-btn app-btn-secondary text-xs"
                    >
                      Receipt
                    </a>
                    <a
                      href={`/api/portal/payments/${p.id}/receipt/pdf`}
                      className="app-btn app-btn-secondary text-xs"
                    >
                      PDF
                    </a>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
