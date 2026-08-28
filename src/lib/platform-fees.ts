import { SiteSettings } from "@/models/SiteSettings";

export type PlatformFeesConfig = {
  agreementFeePercent: number;
  platformFeeMinPercent: number;
  platformFeePercentOwnLegal: number;
};

export type LegalProvider = "hih" | "own_legal";

export const DEFAULT_PLATFORM_FEES: PlatformFeesConfig = {
  agreementFeePercent: 10,
  platformFeeMinPercent: 1,
  platformFeePercentOwnLegal: 1,
};

export async function getPlatformFees(): Promise<PlatformFeesConfig> {
  const row = await SiteSettings.findOne({ key: "global" })
    .select("fees")
    .lean();
  const fees = (row?.fees || {}) as Partial<PlatformFeesConfig>;
  return {
    agreementFeePercent:
      fees.agreementFeePercent ?? DEFAULT_PLATFORM_FEES.agreementFeePercent,
    platformFeeMinPercent:
      fees.platformFeeMinPercent ?? DEFAULT_PLATFORM_FEES.platformFeeMinPercent,
    platformFeePercentOwnLegal:
      fees.platformFeePercentOwnLegal ??
      DEFAULT_PLATFORM_FEES.platformFeePercentOwnLegal,
  };
}

export function computeAgreementFee(
  rentAmount: number,
  percent: number,
  overridePercent?: number | null
) {
  const rate = overridePercent ?? percent;
  return Math.round((rentAmount * rate) / 100);
}

export function computePlatformFee(
  grossAmount: number,
  fees: PlatformFeesConfig,
  legalProvider: LegalProvider
) {
  if (legalProvider === "hih") {
    return 0;
  }
  const rate = Math.max(
    fees.platformFeeMinPercent,
    fees.platformFeePercentOwnLegal
  );
  return Math.round((grossAmount * rate) / 100);
}

export function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

export type FeeBreakdownLine = {
  label: string;
  amount: number;
  kind: "charge" | "deduction" | "total" | "subtotal";
};

export function buildRentFeeBreakdown(input: {
  grossAmount: number;
  currency: string;
  platformFee: number;
  legalProvider: LegalProvider;
}) {
  const lines: FeeBreakdownLine[] = [
    { label: "Rent amount", amount: input.grossAmount, kind: "subtotal" },
  ];
  if (input.platformFee > 0) {
    lines.push({
      label: "House In Hand platform fee",
      amount: input.platformFee,
      kind: "deduction",
    });
  }
  lines.push({
    label: "Net to landlord",
    amount: input.grossAmount - input.platformFee,
    kind: "total",
  });
  return lines;
}

export function buildAgreementFeeBreakdown(input: {
  rentAmount: number;
  agreementFee: number;
  platformFee: number;
  currency: string;
  legalProvider: LegalProvider;
  legalCompanyName?: string | null;
}) {
  const lines: FeeBreakdownLine[] = [
    {
      label: "Annual rent reference",
      amount: input.rentAmount,
      kind: "subtotal",
    },
    {
      label:
        input.legalProvider === "hih"
          ? "Agreement & legal fee (House In Hand)"
          : `Agreement fee (${input.legalCompanyName || "Landlord legal partner"})`,
      amount: input.agreementFee,
      kind: "charge",
    },
  ];
  if (input.platformFee > 0) {
    lines.push({
      label: "House In Hand platform fee",
      amount: input.platformFee,
      kind: "charge",
    });
  }
  lines.push({
    label: "Total paid by tenant",
    amount: input.agreementFee + input.platformFee,
    kind: "total",
  });
  return lines;
}
