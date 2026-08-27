import type { UtilityCategory } from "@/models/UtilityBill";

export type UtilityProviderDef = {
  id: string;
  name: string;
  category: UtilityCategory;
  integrated: boolean;
  accountLabel: string;
  requiresMeterType?: boolean;
  minAmount?: number;
  maxAmount?: number;
  amountPresets?: number[];
};

export const UTILITY_PROVIDERS: UtilityProviderDef[] = [
  {
    id: "ikeja-electric",
    name: "Ikeja Electric (IKEDC)",
    category: "electricity",
    integrated: true,
    accountLabel: "Meter number",
    requiresMeterType: true,
    minAmount: 500,
    amountPresets: [5000, 10000, 20000, 50000],
  },
  {
    id: "eko-electric",
    name: "Eko Electric (EKEDC)",
    category: "electricity",
    integrated: true,
    accountLabel: "Meter number",
    requiresMeterType: true,
    minAmount: 500,
    amountPresets: [5000, 10000, 20000, 50000],
  },
  {
    id: "abuja-electric",
    name: "Abuja Electric (AEDC)",
    category: "electricity",
    integrated: true,
    accountLabel: "Meter number",
    requiresMeterType: true,
    minAmount: 500,
    amountPresets: [5000, 10000, 20000, 50000],
  },
  {
    id: "ibadan-electric",
    name: "Ibadan Electric (IBEDC)",
    category: "electricity",
    integrated: true,
    accountLabel: "Meter number",
    requiresMeterType: true,
    minAmount: 500,
    amountPresets: [5000, 10000, 20000, 50000],
  },
  {
    id: "portharcourt-electric",
    name: "Port Harcourt Electric (PHED)",
    category: "electricity",
    integrated: true,
    accountLabel: "Meter number",
    requiresMeterType: true,
    minAmount: 500,
    amountPresets: [5000, 10000, 20000, 50000],
  },
  {
    id: "enugu-electric",
    name: "Enugu Electric (EEDC)",
    category: "electricity",
    integrated: true,
    accountLabel: "Meter number",
    requiresMeterType: true,
    minAmount: 500,
    amountPresets: [5000, 10000, 20000, 50000],
  },
  {
    id: "kaduna-electric",
    name: "Kaduna Electric (KAEDCO)",
    category: "electricity",
    integrated: true,
    accountLabel: "Meter number",
    requiresMeterType: true,
    minAmount: 500,
    amountPresets: [5000, 10000, 20000, 50000],
  },
  {
    id: "kano-electric",
    name: "Kano Electric (KEDCO)",
    category: "electricity",
    integrated: true,
    accountLabel: "Meter number",
    requiresMeterType: true,
    minAmount: 500,
    amountPresets: [5000, 10000, 20000, 50000],
  },
  {
    id: "jos-electric",
    name: "Jos Electric (JED)",
    category: "electricity",
    integrated: true,
    accountLabel: "Meter number",
    requiresMeterType: true,
    minAmount: 500,
    amountPresets: [5000, 10000, 20000, 50000],
  },
  {
    id: "benin-electric",
    name: "Benin Electric (BEDC)",
    category: "electricity",
    integrated: true,
    accountLabel: "Meter number",
    requiresMeterType: true,
    minAmount: 500,
    amountPresets: [5000, 10000, 20000, 50000],
  },
  {
    id: "dstv",
    name: "DSTV",
    category: "cable",
    integrated: true,
    accountLabel: "Smartcard / IUC number",
    minAmount: 1000,
    amountPresets: [5000, 10000, 15000, 25000],
  },
  {
    id: "gotv",
    name: "GOtv",
    category: "cable",
    integrated: true,
    accountLabel: "IUC number",
    minAmount: 500,
    amountPresets: [1900, 3500, 5500, 8200],
  },
  {
    id: "startimes",
    name: "StarTimes",
    category: "cable",
    integrated: true,
    accountLabel: "Smartcard number",
    minAmount: 500,
    amountPresets: [900, 1900, 3500, 5500],
  },
  {
    id: "manual-water",
    name: "Water board / estate water",
    category: "water",
    integrated: false,
    accountLabel: "Account number",
    minAmount: 500,
  },
  {
    id: "manual-waste",
    name: "Waste / PSP operator",
    category: "waste",
    integrated: false,
    accountLabel: "Customer ID",
    minAmount: 500,
  },
  {
    id: "manual-estate",
    name: "Estate management",
    category: "estate_dues",
    integrated: false,
    accountLabel: "Resident / unit ID",
    minAmount: 500,
  },
  {
    id: "manual-internet",
    name: "Internet provider",
    category: "internet",
    integrated: false,
    accountLabel: "Account / subscriber ID",
    minAmount: 500,
  },
];

export function providersForCategory(category: UtilityCategory) {
  return UTILITY_PROVIDERS.filter((p) => p.category === category);
}

export function getProviderById(id: string) {
  return UTILITY_PROVIDERS.find((p) => p.id === id) || null;
}

export const UTILITY_CATEGORIES: {
  id: UtilityCategory;
  label: string;
  description: string;
}[] = [
  {
    id: "electricity",
    label: "Electricity",
    description: "Prepaid & postpaid DISCO meters via VTpass",
  },
  {
    id: "cable",
    label: "Cable TV",
    description: "DSTV, GOtv, StarTimes subscriptions",
  },
  {
    id: "water",
    label: "Water",
    description: "Water board or estate water bills",
  },
  {
    id: "internet",
    label: "Internet",
    description: "Broadband and fibre subscriptions",
  },
  {
    id: "waste",
    label: "Waste",
    description: "PSP and waste collection fees",
  },
  {
    id: "estate_dues",
    label: "Estate dues",
    description: "Service charge and resident levies",
  },
];
