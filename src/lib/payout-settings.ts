import { SiteSettings } from "@/models/SiteSettings";

export type PayoutProvider = "paystack" | "manual";

export type PayoutSettings = {
  provider: PayoutProvider;
  withdrawalFee: number;
};

export const DEFAULT_PAYOUT_SETTINGS: PayoutSettings = {
  provider: "paystack",
  withdrawalFee: 50,
};

export async function getPayoutSettings(): Promise<PayoutSettings> {
  const row = await SiteSettings.findOne({ key: "global" }).select("payoutSettings fees").lean();
  const payout = (row?.payoutSettings || {}) as Partial<PayoutSettings>;
  const envFee = process.env.WITHDRAWAL_FEE;
  const fallbackFee =
    envFee != null && envFee !== ""
      ? Number(envFee)
      : DEFAULT_PAYOUT_SETTINGS.withdrawalFee;

  return {
    provider: payout.provider === "manual" ? "manual" : "paystack",
    withdrawalFee:
      typeof payout.withdrawalFee === "number"
        ? payout.withdrawalFee
        : fallbackFee,
  };
}

export function computeWithdrawalAmounts(requestedAmount: number, fee: number) {
  const safeFee = Math.max(0, fee);
  const netAmount = Math.max(0, requestedAmount - safeFee);
  return {
    amount: requestedAmount,
    fee: safeFee,
    netAmount,
    totalDebit: requestedAmount,
  };
}
