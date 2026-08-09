import type { RoiMode } from "@/models/Property";

export type ProjectionInput = {
  amount: number;
  roiMode: RoiMode;
  roiValue: number;
  roiPeriodMonths: number;
};

export type ProjectionResult = {
  amount: number;
  profit: number;
  totalReturn: number;
  annualizedRoiPercent: number;
  monthlyAverageProfit: number;
  multiple: number;
  periodMonths: number;
  roiMode: RoiMode;
  roiValue: number;
  /** Human-readable rate label */
  rateLabel: string;
};

export function projectInvestment(input: ProjectionInput): ProjectionResult {
  const amount = Math.max(0, Number(input.amount) || 0);
  const months = Math.max(1, Math.round(Number(input.roiPeriodMonths) || 12));
  const roiValue = Math.max(0, Number(input.roiValue) || 0);
  const roiMode = input.roiMode === "fixed_per_1000" ? "fixed_per_1000" : "percent";

  let profit = 0;
  let rateLabel = "";

  if (roiMode === "percent") {
    profit = amount * (roiValue / 100);
    rateLabel = `${roiValue}% over ${months} month${months === 1 ? "" : "s"}`;
  } else {
    profit = (amount / 1000) * roiValue;
    rateLabel = `£${roiValue.toLocaleString("en-GB")} per £1,000 over ${months} month${months === 1 ? "" : "s"}`;
  }

  const years = months / 12;
  const annualizedRoiPercent =
    amount > 0 && years > 0 ? (profit / amount / years) * 100 : 0;
  const monthlyAverageProfit = profit / months;
  const totalReturn = amount + profit;
  const multiple = amount > 0 ? totalReturn / amount : 1;

  return {
    amount: round2(amount),
    profit: round2(profit),
    totalReturn: round2(totalReturn),
    annualizedRoiPercent: round2(annualizedRoiPercent),
    monthlyAverageProfit: round2(monthlyAverageProfit),
    multiple: round2(multiple),
    periodMonths: months,
    roiMode,
    roiValue,
    rateLabel,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function formatPeriod(months: number) {
  if (months % 12 === 0) {
    const years = months / 12;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  return `${months} month${months === 1 ? "" : "s"}`;
}
