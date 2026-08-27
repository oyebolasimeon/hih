import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import {
  isFixedPriceVariation,
  mapVtpassCategory,
  parseAmount,
} from "@/lib/utility-catalog";
import { vtpassGetServices, vtpassGetVariations } from "@/lib/vtpass";
import { requireActiveProfile } from "@/lib/profile-context";
import { UtilityBill } from "@/models/UtilityBill";

function serializeBill(b: Record<string, unknown>) {
  return {
    id: String(b._id),
    userId: String(b.userId),
    profileId: String(b.profileId),
    category: b.category,
    vtpassCategory: b.vtpassCategory || null,
    provider: b.provider,
    providerId: b.providerId,
    accountNumber: b.accountNumber,
    meterType: b.meterType || null,
    variationCode: b.variationCode || null,
    variationName: b.variationName || null,
    customerName: b.customerName || null,
    customerAddress: b.customerAddress || null,
    phone: b.phone || null,
    amount: b.amount,
    currency: b.currency || "NGN",
    status: b.status,
    integration: b.integration || "manual",
    providerRef: b.providerRef || null,
    paystackRef: b.paystackRef || null,
    vtpassRequestId: b.vtpassRequestId || null,
    purchaseToken: b.purchaseToken || null,
    vtpassStatus: b.vtpassStatus || null,
    paidAt: b.paidAt || null,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const rows = await UtilityBill.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return NextResponse.json({
    bills: rows.map((b) => serializeBill(b as unknown as Record<string, unknown>)),
  });
}

const createSchema = z.object({
  serviceID: z.string().trim().min(1),
  vtpassCategory: z.string().trim().min(1),
  accountNumber: z.string().trim().min(1).max(80),
  meterType: z.enum(["prepaid", "postpaid"]).optional(),
  variationCode: z.string().trim().optional(),
  customerName: z.string().trim().max(120).optional(),
  customerAddress: z.string().trim().max(240).optional(),
  phone: z.string().trim().min(10).max(15),
  amount: z.number().positive().max(5_000_000),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, ["tenant", "student"]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid bill." },
      { status: 400 }
    );
  }

  const meta = mapVtpassCategory(parsed.data.vtpassCategory);
  if (meta.requiresMeterType && !parsed.data.meterType && !parsed.data.variationCode) {
    return NextResponse.json(
      { error: "Meter type is required for electricity." },
      { status: 400 }
    );
  }

  let providerName = parsed.data.serviceID;
  let minAmount = 0;
  let maxAmount = 5_000_000;
  let variationName: string | undefined;

  try {
    const services = await vtpassGetServices(parsed.data.vtpassCategory);
    const service = services.find((s) => s.serviceID === parsed.data.serviceID);
    if (service) {
      providerName = service.name;
      minAmount = parseAmount(service.minimium_amount);
      maxAmount = parseAmount(service.maximum_amount) || maxAmount;
    }

    if (parsed.data.variationCode) {
      const { variations } = await vtpassGetVariations(parsed.data.serviceID);
      const plan = variations.find(
        (v) => v.variation_code === parsed.data.variationCode
      );
      if (plan) {
        variationName = plan.name;
        if (isFixedPriceVariation(plan.fixedPrice)) {
          const fixed = parseAmount(plan.variation_amount);
          if (fixed > 0 && parsed.data.amount !== fixed) {
            return NextResponse.json(
              { error: `This plan costs NGN ${fixed.toLocaleString()}.` },
              { status: 400 }
            );
          }
        }
      }
    }
  } catch {
    /* allow mock / fallback */
  }

  if (minAmount > 0 && parsed.data.amount < minAmount) {
    return NextResponse.json(
      { error: `Minimum amount is NGN ${minAmount.toLocaleString()}.` },
      { status: 400 }
    );
  }
  if (maxAmount > 0 && parsed.data.amount > maxAmount) {
    return NextResponse.json(
      { error: `Maximum amount is NGN ${maxAmount.toLocaleString()}.` },
      { status: 400 }
    );
  }

  await connectDB();
  const bill = await UtilityBill.create({
    userId: user.id,
    profileId: active.profile._id,
    category: meta.portalCategory,
    vtpassCategory: parsed.data.vtpassCategory,
    provider: providerName,
    providerId: parsed.data.serviceID,
    accountNumber: parsed.data.accountNumber,
    meterType: parsed.data.meterType,
    variationCode: parsed.data.variationCode || parsed.data.meterType,
    variationName,
    customerName: parsed.data.customerName,
    customerAddress: parsed.data.customerAddress,
    phone: parsed.data.phone,
    amount: parsed.data.amount,
    currency: "NGN",
    status: "pending",
    integration: "vtpass",
  });

  return NextResponse.json(
    { bill: serializeBill(bill.toObject() as unknown as Record<string, unknown>) },
    { status: 201 }
  );
}
