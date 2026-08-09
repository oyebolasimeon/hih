import { z } from "zod";

export const PROPERTY_STATUS = [
  "active",
  "pending",
  "inactive",
  "sold",
] as const;

export function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map(String).map((t) => t.trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export const investorPropertyCreateSchema = z.object({
  name: z.string().trim().min(2),
  nickname: z.string().trim().optional().default(""),
  address: z.string().trim().min(2),
  propertyType: z.string().trim().optional().default(""),
  zone: z.string().trim().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  status: z.enum(PROPERTY_STATUS).default("active"),
  purchasePrice: z.number().min(0).default(0),
  currentValue: z.number().min(0).default(0),
  monthlyRent: z.number().min(0).default(0),
});

export const investorPropertyUpdateSchema = investorPropertyCreateSchema
  .partial()
  .extend({
    imageUrls: z.array(z.string().url()).optional(),
  });

export function serializeProperty(p: {
  _id: unknown;
  name: string;
  nickname?: string;
  address: string;
  propertyType?: string;
  zone?: string;
  tags?: string[];
  imageUrls: string[];
  status: string;
  purchasePrice: number;
  currentValue: number;
  monthlyRent?: number;
  acquisitionType?: string | null;
}) {
  return {
    id: String(p._id),
    name: p.name,
    nickname: p.nickname || "",
    address: p.address,
    propertyType: p.propertyType || "",
    zone: p.zone || "",
    tags: p.tags || [],
    imageUrls: p.imageUrls || [],
    status: p.status,
    purchasePrice: p.purchasePrice,
    currentValue: p.currentValue,
    monthlyRent: p.monthlyRent || 0,
    acquisitionType: p.acquisitionType || null,
  };
}

export function formPropertyPayload(form: FormData) {
  return {
    name: form.get("name"),
    nickname: form.get("nickname") || "",
    address: form.get("address"),
    propertyType: form.get("propertyType") || "",
    zone: form.get("zone") || "",
    tags: parseTags(form.get("tags")),
    status: form.get("status") || "active",
    purchasePrice: Number(form.get("purchasePrice") || 0),
    currentValue: Number(form.get("currentValue") || 0),
    monthlyRent: Number(form.get("monthlyRent") || 0),
  };
}
