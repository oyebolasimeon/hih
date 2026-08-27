import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { getProviderById } from "@/lib/utility-providers";
import { requireActiveProfile } from "@/lib/profile-context";
import { UtilityBill } from "@/models/UtilityBill";

function serializeBill(b: Record<string, unknown>) {
  return {
    id: String(b._id),
    userId: String(b.userId),
    profileId: String(b.profileId),
    category: b.category,
    provider: b.provider,
    providerId: b.providerId,
    accountNumber: b.accountNumber,
    meterType: b.meterType || null,
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
  providerId: z.string().trim().min(1),
  accountNumber: z.string().trim().min(1).max(80),
  meterType: z.enum(["prepaid", "postpaid"]).optional(),
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

  const provider = getProviderById(parsed.data.providerId);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  if (provider.requiresMeterType && !parsed.data.meterType) {
    return NextResponse.json(
      { error: "Meter type is required for this provider." },
      { status: 400 }
    );
  }

  if (provider.minAmount && parsed.data.amount < provider.minAmount) {
    return NextResponse.json(
      { error: `Minimum amount is NGN ${provider.minAmount.toLocaleString()}.` },
      { status: 400 }
    );
  }

  await connectDB();
  const bill = await UtilityBill.create({
    userId: user.id,
    profileId: active.profile._id,
    category: provider.category,
    provider: provider.name,
    providerId: provider.id,
    accountNumber: parsed.data.accountNumber,
    meterType: parsed.data.meterType,
    customerName: parsed.data.customerName,
    customerAddress: parsed.data.customerAddress,
    phone: parsed.data.phone,
    amount: parsed.data.amount,
    currency: "NGN",
    status: "pending",
    integration: provider.integrated ? "vtpass" : "manual",
  });

  return NextResponse.json(
    { bill: serializeBill(bill.toObject() as unknown as Record<string, unknown>) },
    { status: 201 }
  );
}
