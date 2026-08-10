import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { requireActiveProfile } from "@/lib/profile-context";
import { SavingsGoal } from "@/models/SavingsGoal";

function serializeGoal(g: Record<string, unknown>) {
  return {
    id: String(g._id),
    userId: String(g.userId),
    profileId: String(g.profileId),
    title: g.title,
    targetAmount: g.targetAmount,
    savedAmount: g.savedAmount,
    currency: g.currency || "NGN",
    cadence: g.cadence,
    status: g.status,
    createdAt: g.createdAt,
    updatedAt: g.updatedAt,
  };
}

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const rows = await SavingsGoal.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    goals: rows.map((g) => serializeGoal(g as unknown as Record<string, unknown>)),
  });
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  targetAmount: z.number().positive().max(50_000_000),
  cadence: z.enum(["weekly", "monthly"]).default("monthly"),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid savings goal." },
      { status: 400 }
    );
  }

  await connectDB();
  const goal = await SavingsGoal.create({
    userId: user.id,
    profileId: active.profile._id,
    title: parsed.data.title,
    targetAmount: parsed.data.targetAmount,
    savedAmount: 0,
    currency: "NGN",
    cadence: parsed.data.cadence,
    status: "active",
  });

  return NextResponse.json(
    { goal: serializeGoal(goal.toObject() as unknown as Record<string, unknown>) },
    { status: 201 }
  );
}
