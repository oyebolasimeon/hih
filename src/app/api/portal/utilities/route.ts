import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { requireActiveProfile } from "@/lib/profile-context";
import { UtilityBill } from "@/models/UtilityBill";

function serializeBill(b: Record<string, unknown>) {
  return {
    id: String(b._id),
    userId: String(b.userId),
    profileId: String(b.profileId),
    category: b.category,
    provider: b.provider,
    accountNumber: b.accountNumber,
    amount: b.amount,
    currency: b.currency || "NGN",
    status: b.status,
    providerRef: b.providerRef || null,
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
  category: z.enum([
    "electricity",
    "water",
    "waste",
    "estate_dues",
    "internet",
    "cable",
  ]),
  provider: z.string().trim().min(1).max(120),
  accountNumber: z.string().trim().min(1).max(80),
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

  await connectDB();
  const bill = await UtilityBill.create({
    userId: user.id,
    profileId: active.profile._id,
    category: parsed.data.category,
    provider: parsed.data.provider,
    accountNumber: parsed.data.accountNumber,
    amount: parsed.data.amount,
    currency: "NGN",
    status: "pending",
  });

  return NextResponse.json(
    { bill: serializeBill(bill.toObject() as unknown as Record<string, unknown>) },
    { status: 201 }
  );
}
