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
  netPayeeAmount: number | null;
  currency: string;
  status: string;
  purpose: string | null;
  source: string;
  providerRef: string | null;
  receiptUrl: string | null;
  receiptNumber: string | null;
  rentPeriodLabel: string | null;
  refundAmount: number | null;
  refundReason: string | null;
  refundedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  canRefund: boolean;
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

type PaymentMethodRow = {
  id: string;
  cardType: string;
  last4: string;
  expMonth: string | null;
  expYear: string | null;
  bank: string | null;
  isDefault: boolean;
};

type AutoPayState = {
  enabled: boolean;
  includeRent: boolean;
  includeServiceDues: boolean;
  paymentMethodId: string | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunError: string | null;
};

type DefaulterRow = {
  leaseId: string;
  tenant: { profileId: string; name: string; userId: string };
  listing: { id: string; title: string; address?: string };
  rent: {
    paid: boolean;
    overdue: boolean;
    dueSoon: boolean;
    periodLabel: string;
    periodEnd: string;
    amount: number;
    currency: string;
    daysUntilDue: number;
    daysOverdue: number;
  } | null;
  serviceDues: Array<{
    chargeId: string;
    serviceName: string;
    amount: number;
    currency: string;
    dueDate: string;
    daysOverdue: number;
    overdue: boolean;
  }>;
  isDefaulter: boolean;
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
  legalProvider: "hih" | "own_legal" | null;
  legalCompanyName: string | null;
  breakdown: Array<{ label: string; amount: number; kind: string }>;
  listing: {
    title: string;
    address?: string;
    listingType?: string;
    bedrooms?: number;
    bathrooms?: number;
    sizeSqm?: number;
    amenities: string[];
    rentAmount?: number;
    rentPeriod?: string;
  } | null;
  payee: { name: string; type: string } | null;
  payer: { name: string } | null;
  signatures: Array<{ role: string; name: string; signedAt?: string | null }>;
  lease: { paymentPeriod: string; rentAmount?: number; currency?: string } | null;
};

function formatLegalHandler(
  legalProvider: "hih" | "own_legal" | null | undefined,
  companyName?: string | null
) {
  if (legalProvider === "hih") return "House In Hand (HIH Legal Team)";
  if (legalProvider === "own_legal") {
    return companyName?.trim() || "Landlord-appointed legal firm";
  }
  return "—";
}

function formatListingType(type?: string) {
  if (!type) return null;
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  if (status === "refunded") {
    return "bg-amber-500/10 text-amber-900 dark:text-amber-100 border-amber-500/30";
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
  if (type === "rent_refund") return "Rent refund";
  if (type === "service_due") return "Service due";
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
  const [refundId, setRefundId] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([]);
  const [autoPay, setAutoPay] = useState<AutoPayState | null>(null);
  const [attachingCard, setAttachingCard] = useState(false);
  const [savingAutoPay, setSavingAutoPay] = useState(false);
  const [defaulters, setDefaulters] = useState<DefaulterRow[]>([]);
  const [dueSoonTenants, setDueSoonTenants] = useState<DefaulterRow[]>([]);
  const [defaultersLoading, setDefaultersLoading] = useState(false);

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

  const loadAutoPay = useCallback(async (selectedLeaseId: string) => {
    if (!selectedLeaseId) {
      setAutoPay(null);
      return;
    }
    const res = await fetch(
      `/api/portal/auto-pay?leaseId=${encodeURIComponent(selectedLeaseId)}`
    );
    const data = await res.json();
    if (res.ok) setAutoPay(data.autoPay || null);
  }, []);

  const loadPaymentMethods = useCallback(async (profileId: string) => {
    const res = await fetch(
      `/api/portal/payments/methods?profileId=${encodeURIComponent(profileId)}`
    );
    const data = await res.json();
    if (res.ok) setPaymentMethods(data.methods || []);
  }, []);

  const loadDefaulters = useCallback(async () => {
    setDefaultersLoading(true);
    const res = await fetch("/api/portal/payments/defaulters?includeDueSoon=1");
    const data = await res.json();
    setDefaultersLoading(false);
    if (res.ok) {
      setDefaulters(data.defaulters || []);
      setDueSoonTenants(data.dueSoon || []);
    }
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
    if (isTenantLike) {
      await loadPaymentMethods(profile.id);
    }
    if (isLandlordLike) {
      await loadDefaulters();
    }
  }, [leaseId, profile?.id, isTenantLike, isLandlordLike, loadWallet, loadPaymentMethods, loadDefaulters]);

  useEffect(() => {
    if (profileLoading) return;
    void load();
  }, [profileLoading, profile?.id, load]);

  useEffect(() => {
    if (!isTenantLike || !leaseId) return;
    void loadAutoPay(leaseId);
  }, [isTenantLike, leaseId, loadAutoPay]);

  useEffect(() => {
    if (!isTenantLike || !leaseId) return;
    void loadRentStatus(leaseId);
  }, [isTenantLike, leaseId, loadRentStatus]);

  useEffect(() => {
    if (!isLandlordLike && !isTenantLike) return;
    void (async () => {
      const res = await fetch("/api/portal/wallet/bank");
      const data = await res.json();
      if (res.ok) setBanks(data.banks || []);
    })();
  }, [isLandlordLike, isTenantLike]);

  useEffect(() => {
    const paid = searchParams.get("paid");
    const deposit = searchParams.get("deposit");
    const card = searchParams.get("card");
    const mockRef = searchParams.get("mock_ref");
    const ref = mockRef || searchParams.get("reference");
    if ((paid === "1" || deposit === "1" || card === "1") && ref) {
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
          card === "1"
            ? "Card saved for auto-pay."
            : deposit === "1"
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
      setReceipt(null);
      try {
        const res = await fetch(`/api/portal/payments/${receiptId}/receipt`);
        const text = await res.text();
        const data = text ? (JSON.parse(text) as { receipt?: ReceiptData; error?: string }) : {};
        if (res.ok && data.receipt) {
          setReceipt(data.receipt);
        } else {
          setError(data.error || "Could not load receipt.");
        }
      } catch {
        setError("Could not load receipt.");
      } finally {
        setReceiptLoading(false);
      }
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

  async function onAttachCard() {
    if (!profile?.id) return;
    setAttachingCard(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/payments/methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id }),
    });
    const data = await res.json();
    setAttachingCard(false);
    if (!res.ok) {
      setError(data.error || "Could not start card setup.");
      return;
    }
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    }
  }

  async function onRemoveCard(methodId: string) {
    setError("");
    setMessage("");
    const res = await fetch(`/api/portal/payments/methods/${methodId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not remove card.");
      return;
    }
    setMessage("Card removed.");
    if (profile?.id) await loadPaymentMethods(profile.id);
  }

  async function onSetDefaultCard(methodId: string) {
    setError("");
    const res = await fetch(`/api/portal/payments/methods/${methodId}`, {
      method: "PATCH",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not update default card.");
      return;
    }
    if (profile?.id) await loadPaymentMethods(profile.id);
  }

  async function onSaveAutoPay(patch: Partial<AutoPayState>) {
    if (!leaseId) {
      setError("Select an active lease.");
      return;
    }
    if (patch.enabled && paymentMethods.length === 0) {
      setError("Attach a card before enabling auto-pay.");
      return;
    }
    setSavingAutoPay(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/portal/auto-pay", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leaseId,
        ...patch,
      }),
    });
    const data = await res.json();
    setSavingAutoPay(false);
    if (!res.ok) {
      setError(data.error || "Could not save auto-pay settings.");
      return;
    }
    setAutoPay(data.autoPay || null);
    setMessage("Auto-pay settings saved.");
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

  async function onRefund(e: FormEvent) {
    e.preventDefault();
    if (!refundId || !profile?.id) return;
    setRefunding(true);
    setError("");
    const res = await fetch(`/api/portal/payments/${refundId}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: profile.id,
        reason: refundReason,
      }),
    });
    const data = await res.json();
    setRefunding(false);
    if (!res.ok) {
      setError(data.error || "Could not issue refund.");
      return;
    }
    setMessage(
      `Refund of ${formatMoney(data.payment?.refundAmount || 0)} issued. Tenant has been notified.`
    );
    setRefundId("");
    setRefundReason("");
    await load();
  }

  const rentPayments = useMemo(
    () => rows.filter((p) => p.purpose === "rent"),
    [rows]
  );

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

      {isLandlordLike ? (
        <Reveal>
          <section className="app-card overflow-hidden">
            <div className="px-5 py-6 border-b border-border/60 bg-gradient-to-br from-danger/5 to-amber-500/10">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold">Payment defaulters</h2>
                  <p className="text-sm text-muted mt-1">
                    Tenants with overdue rent or service dues. Reminders are sent automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void loadDefaulters()}
                  disabled={defaultersLoading}
                  className="app-btn app-btn-secondary text-xs"
                >
                  {defaultersLoading ? "Refreshing…" : "Refresh"}
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {defaultersLoading && defaulters.length === 0 && dueSoonTenants.length === 0 ? (
                <p className="text-sm text-muted">Loading tenant payment status…</p>
              ) : defaulters.length === 0 && dueSoonTenants.length === 0 ? (
                <p className="text-sm text-muted">
                  No overdue payments. All active tenants are up to date.
                </p>
              ) : (
                <>
                  {defaulters.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-danger">
                        Overdue ({defaulters.length})
                      </p>
                      <ul className="space-y-2">
                        {defaulters.map((d) => (
                          <li
                            key={d.leaseId}
                            className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <p className="font-medium">{d.tenant.name}</p>
                                <p className="text-muted text-xs mt-0.5">
                                  {d.listing.title}
                                  {d.listing.address ? ` · ${d.listing.address}` : ""}
                                </p>
                              </div>
                              <span className="rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-danger">
                                Overdue
                              </span>
                            </div>
                            <ul className="mt-2 space-y-1 text-xs">
                              {d.rent?.overdue ? (
                                <li>
                                  Rent {formatMoney(d.rent.amount, d.rent.currency)} ·{" "}
                                  {d.rent.periodLabel} · {d.rent.daysOverdue} day(s) late
                                </li>
                              ) : null}
                              {d.serviceDues.map((s) => (
                                <li key={s.chargeId}>
                                  {s.serviceName}{" "}
                                  {formatMoney(s.amount, s.currency)} · {s.daysOverdue} day(s)
                                  late
                                </li>
                              ))}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {dueSoonTenants.length > 0 ? (
                    <div className="space-y-2 border-t border-border/60 pt-4">
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                        Due soon ({dueSoonTenants.length})
                      </p>
                      <ul className="space-y-2">
                        {dueSoonTenants.map((d) => (
                          <li
                            key={d.leaseId}
                            className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm"
                          >
                            <p className="font-medium">{d.tenant.name}</p>
                            <p className="text-muted text-xs mt-0.5">{d.listing.title}</p>
                            {d.rent ? (
                              <p className="text-xs mt-1">
                                Rent {formatMoney(d.rent.amount, d.rent.currency)} due in{" "}
                                {d.rent.daysUntilDue} day(s) · {d.rent.periodLabel}
                              </p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </section>
        </Reveal>
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
                {receipt.listing ? (
                  <div className="rounded-xl border border-border/60 overflow-hidden">
                    <div className="px-4 py-3 bg-gradient-to-r from-brand/10 to-teal/10 border-b border-border/60">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                        Property
                      </p>
                      <p className="font-display font-semibold mt-1">
                        {receipt.listing.title}
                      </p>
                      {receipt.listing.address ? (
                        <p className="text-sm text-muted mt-1">{receipt.listing.address}</p>
                      ) : null}
                    </div>
                    <div className="p-4 space-y-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {formatListingType(receipt.listing.listingType) ? (
                          <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs">
                            {formatListingType(receipt.listing.listingType)}
                          </span>
                        ) : null}
                        {receipt.listing.bedrooms != null ? (
                          <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs">
                            {receipt.listing.bedrooms} bed
                          </span>
                        ) : null}
                        {receipt.listing.bathrooms != null ? (
                          <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs">
                            {receipt.listing.bathrooms} bath
                          </span>
                        ) : null}
                        {receipt.listing.sizeSqm != null ? (
                          <span className="rounded-full border border-border/60 px-2.5 py-0.5 text-xs">
                            {receipt.listing.sizeSqm} sqm
                          </span>
                        ) : null}
                      </div>
                      {receipt.listing.amenities?.length ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                            What&apos;s in the house
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {receipt.listing.amenities.map((item) => (
                              <span
                                key={item}
                                className="rounded-md bg-surface/80 border border-border/50 px-2 py-1 text-xs"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

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
                  {receipt.rentPeriodLabel ? (
                    <div>
                      <dt className="text-muted">Rent period</dt>
                      <dd>{receipt.rentPeriodLabel}</dd>
                    </div>
                  ) : null}
                  <div className="sm:col-span-2">
                    <dt className="text-muted">Legal handler</dt>
                    <dd className="font-semibold text-brand-dark">
                      {formatLegalHandler(
                        receipt.legalProvider,
                        receipt.legalCompanyName
                      )}
                    </dd>
                  </div>
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
                <div className="px-5 py-6 border-b border-border/60 bg-gradient-to-br from-brand/5 to-teal/10">
                  <h2 className="font-display text-lg font-semibold">Auto-pay</h2>
                  <p className="text-sm text-muted mt-1">
                    When rent or service dues are due, we debit your wallet first, then your saved card for any remainder. Funds go to your landlord&apos;s wallet.
                  </p>
                </div>
                <div className="p-5 space-y-4">
                  {tenantLeases.length === 0 ? (
                    <p className="text-sm text-muted">
                      Complete an agreement to enable auto-pay.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Saved cards</p>
                        {paymentMethods.length === 0 ? (
                          <p className="text-sm text-muted">
                            No card on file. A small verification charge (NGN 100) is used to save your card securely.
                          </p>
                        ) : (
                          <ul className="space-y-2">
                            {paymentMethods.map((m) => (
                              <li
                                key={m.id}
                                className="rounded-lg border border-border/60 bg-surface/40 p-3 text-sm flex flex-wrap items-center justify-between gap-2"
                              >
                                <div>
                                  <p className="font-medium capitalize">
                                    {m.cardType || "Card"} ···· {m.last4}
                                    {m.isDefault ? (
                                      <span className="ml-2 text-xs text-brand font-normal">Default</span>
                                    ) : null}
                                  </p>
                                  {m.expMonth && m.expYear ? (
                                    <p className="text-xs text-muted mt-0.5">
                                      Expires {m.expMonth}/{m.expYear}
                                      {m.bank ? ` · ${m.bank}` : ""}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {!m.isDefault ? (
                                    <button
                                      type="button"
                                      onClick={() => onSetDefaultCard(m.id)}
                                      className="app-btn app-btn-secondary text-xs"
                                    >
                                      Make default
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    onClick={() => onRemoveCard(m.id)}
                                    className="app-btn app-btn-secondary text-xs text-danger"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                        <button
                          type="button"
                          onClick={onAttachCard}
                          disabled={attachingCard || verifying}
                          className="app-btn app-btn-secondary text-sm"
                        >
                          {attachingCard || verifying
                            ? "Redirecting…"
                            : paymentMethods.length
                              ? "Add another card"
                              : "Attach card"}
                        </button>
                      </div>

                      {leaseId ? (
                        <div className="border-t border-border/60 pt-4 space-y-3">
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={autoPay?.enabled ?? false}
                              disabled={savingAutoPay}
                              onChange={(e) =>
                                void onSaveAutoPay({ enabled: e.target.checked })
                              }
                            />
                            <span className="text-sm">
                              <span className="font-medium block">Enable auto-pay for this lease</span>
                              <span className="text-muted">
                                Automatically collect when rent or service dues are due.
                              </span>
                            </span>
                          </label>

                          {autoPay?.enabled ? (
                            <div className="pl-7 space-y-2">
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={autoPay.includeRent}
                                  disabled={savingAutoPay}
                                  onChange={(e) =>
                                    void onSaveAutoPay({ includeRent: e.target.checked })
                                  }
                                />
                                Monthly rent
                              </label>
                              <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={autoPay.includeServiceDues}
                                  disabled={savingAutoPay}
                                  onChange={(e) =>
                                    void onSaveAutoPay({ includeServiceDues: e.target.checked })
                                  }
                                />
                                Service dues (monthly / yearly)
                              </label>
                            </div>
                          ) : null}

                          {autoPay?.lastRunAt ? (
                            <p className="text-xs text-muted pl-7">
                              Last run: {new Date(autoPay.lastRunAt).toLocaleString()}
                              {autoPay.lastRunStatus
                                ? ` · ${autoPay.lastRunStatus}`
                                : ""}
                              {autoPay.lastRunError ? (
                                <span className="block text-danger mt-0.5">
                                  {autoPay.lastRunError}
                                </span>
                              ) : null}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

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
        {rentPayments.length === 0 ? (
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
            {rentPayments.map((p) => (
              <li
                key={p.id}
                className="app-card p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">
                        {formatMoney(p.amount, p.currency)}
                        {isLandlordLike && p.netPayeeAmount != null ? (
                          <span className="text-sm text-muted font-normal">
                            {" "}
                            · net {formatMoney(p.netPayeeAmount, p.currency)}
                          </span>
                        ) : null}
                      </p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${statusClass(p.status)}`}
                      >
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      {p.receiptNumber ? `${p.receiptNumber} · ` : ""}
                      {p.rentPeriodLabel ? `${p.rentPeriodLabel} · ` : ""}
                      {p.providerRef ? `Ref ${p.providerRef}` : "Online payment"}
                      {p.paidAt
                        ? ` · ${new Date(p.paidAt).toLocaleString()}`
                        : ` · ${new Date(p.createdAt).toLocaleString()}`}
                    </p>
                    {p.status === "refunded" && p.refundAmount ? (
                      <p className="text-xs text-muted mt-1">
                        Refunded {formatMoney(p.refundAmount, p.currency)}
                        {p.refundedAt
                          ? ` · ${new Date(p.refundedAt).toLocaleString()}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {p.status === "successful" ? (
                      <>
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
                        {p.canRefund ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRefundId(p.id);
                              setRefundReason("");
                            }}
                            className="app-btn app-btn-secondary text-xs"
                          >
                            Refund tenant
                          </button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </div>

                {refundId === p.id ? (
                  <form
                    onSubmit={onRefund}
                    className="border-t border-border/60 pt-3 space-y-3"
                  >
                    <p className="text-sm font-medium">Issue rent refund</p>
                    <p className="text-xs text-muted">
                      {formatMoney(p.amount, p.currency)} will be returned to the
                      tenant&apos;s wallet.{" "}
                      {p.netPayeeAmount != null
                        ? `${formatMoney(p.netPayeeAmount, p.currency)} will be debited from your wallet.`
                        : "Your wallet will be debited."}
                    </p>
                    <textarea
                      className="app-input w-full min-h-[80px]"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      placeholder="Reason for refund (required)"
                      required
                      minLength={10}
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={refunding}
                        className="app-btn app-btn-primary text-xs"
                      >
                        {refunding ? "Processing…" : "Confirm refund"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefundId("")}
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
        )}
      </section>
    </div>
  );
}
