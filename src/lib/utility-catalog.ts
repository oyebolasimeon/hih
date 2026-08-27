import type { UtilityCategory } from "@/models/UtilityBill";

/** Maps VTpass category identifiers to portal display categories. */
export const VTPASS_CATEGORY_MAP: Record<
  string,
  {
    portalCategory: UtilityCategory;
    label: string;
    description: string;
    accountLabel: string;
    requiresVerify: boolean;
    requiresMeterType: boolean;
    billersCodeIsPhone: boolean;
  }
> = {
  "electricity-bill": {
    portalCategory: "electricity",
    label: "Electricity",
    description: "Prepaid & postpaid DISCO meters",
    accountLabel: "Meter number",
    requiresVerify: true,
    requiresMeterType: true,
    billersCodeIsPhone: false,
  },
  "tv-subscription": {
    portalCategory: "cable",
    label: "Cable TV",
    description: "DSTV, GOtv, StarTimes, Showmax",
    accountLabel: "Smartcard / IUC number",
    requiresVerify: true,
    requiresMeterType: false,
    billersCodeIsPhone: false,
  },
  data: {
    portalCategory: "internet",
    label: "Internet data",
    description: "MTN, Airtel, GLO, 9mobile, Smile, Spectranet",
    accountLabel: "Phone number",
    requiresVerify: false,
    requiresMeterType: false,
    billersCodeIsPhone: true,
  },
  airtime: {
    portalCategory: "airtime",
    label: "Airtime",
    description: "Top up any Nigerian network",
    accountLabel: "Phone number",
    requiresVerify: false,
    requiresMeterType: false,
    billersCodeIsPhone: true,
  },
  education: {
    portalCategory: "education",
    label: "Education",
    description: "WAEC, JAMB pins and registration",
    accountLabel: "Reference / phone",
    requiresVerify: false,
    requiresMeterType: false,
    billersCodeIsPhone: false,
  },
  insurance: {
    portalCategory: "insurance",
    label: "Insurance",
    description: "Motor and personal accident insurance",
    accountLabel: "Policy / plate number",
    requiresVerify: true,
    requiresMeterType: false,
    billersCodeIsPhone: false,
  },
  "other-services": {
    portalCategory: "other",
    label: "Other services",
    description: "Additional bill merchants",
    accountLabel: "Account / reference",
    requiresVerify: false,
    requiresMeterType: false,
    billersCodeIsPhone: false,
  },
};

export function mapVtpassCategory(identifier: string) {
  return VTPASS_CATEGORY_MAP[identifier] || {
    portalCategory: "other" as UtilityCategory,
    label: identifier.replace(/-/g, " "),
    description: "Bill payment service",
    accountLabel: "Account number",
    requiresVerify: false,
    requiresMeterType: false,
    billersCodeIsPhone: false,
  };
}

export function isFixedPriceVariation(fixedPrice?: string) {
  return fixedPrice?.toLowerCase() === "yes";
}

export function parseAmount(value?: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function serviceUsesVariations(productType?: string) {
  return productType?.toLowerCase() === "fix";
}
