import { z } from "zod";

export const investmentFieldsSchema = z.object({
  description: z.string().trim().max(8000).optional(),
  listedForInvestment: z.boolean().optional(),
  roiMode: z.enum(["percent", "fixed_per_1000"]).optional(),
  roiValue: z.number().min(0).optional(),
  roiPeriodMonths: z.number().int().min(1).max(600).optional(),
  minInvestment: z.number().min(0).optional(),
  maxInvestment: z.number().min(0).nullable().optional(),
  targetRaise: z.number().min(0).nullable().optional(),
  highlights: z.array(z.string().trim().min(1).max(200)).max(12).optional(),
});

export function parseInvestmentFromForm(form: FormData) {
  const listedRaw = form.get("listedForInvestment");
  const maxRaw = form.get("maxInvestment");
  const targetRaw = form.get("targetRaise");
  const highlightsRaw = String(form.get("highlights") || "");

  return investmentFieldsSchema.safeParse({
    description: String(form.get("description") || ""),
    listedForInvestment:
      listedRaw === "true" || listedRaw === "on" || listedRaw === "1",
    roiMode: form.get("roiMode") || "percent",
    roiValue: Number(form.get("roiValue") || 0),
    roiPeriodMonths: Number(form.get("roiPeriodMonths") || 12),
    minInvestment: Number(form.get("minInvestment") || 1000),
    maxInvestment:
      maxRaw === "" || maxRaw == null ? null : Number(maxRaw),
    targetRaise:
      targetRaw === "" || targetRaw == null ? null : Number(targetRaw),
    highlights: highlightsRaw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  });
}

export const PROPERTY_INVESTMENT_FIELDS = [
  "description",
  "listedForInvestment",
  "roiMode",
  "roiValue",
  "roiPeriodMonths",
  "minInvestment",
  "maxInvestment",
  "targetRaise",
  "highlights",
] as const;

export function serializeInvestmentFields(p: {
  description?: string;
  listedForInvestment?: boolean;
  roiMode?: string;
  roiValue?: number;
  roiPeriodMonths?: number;
  minInvestment?: number;
  maxInvestment?: number | null;
  targetRaise?: number | null;
  highlights?: string[];
}) {
  return {
    description: p.description || "",
    listedForInvestment: Boolean(p.listedForInvestment),
    roiMode: p.roiMode === "fixed_per_1000" ? "fixed_per_1000" : "percent",
    roiValue: p.roiValue ?? 0,
    roiPeriodMonths: p.roiPeriodMonths ?? 12,
    minInvestment: p.minInvestment ?? 1000,
    maxInvestment: p.maxInvestment ?? null,
    targetRaise: p.targetRaise ?? null,
    highlights: p.highlights || [],
  };
}
