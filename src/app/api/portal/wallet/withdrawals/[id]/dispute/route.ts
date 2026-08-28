import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { openWithdrawalDispute } from "@/lib/withdrawal-service";

type RouteCtx = { params: Promise<{ id: string }> };

const disputeSchema = z.object({
  reason: z.string().trim().min(10).max(2000),
});

export async function POST(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid withdrawal." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = disputeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Describe the issue." },
      { status: 400 }
    );
  }

  await connectDB();

  try {
    const withdrawal = await openWithdrawalDispute({
      withdrawalId: new mongoose.Types.ObjectId(id),
      userId: user.id,
      reason: parsed.data.reason,
    });
    return NextResponse.json({
      withdrawal: {
        id: String(withdrawal._id),
        disputeStatus: withdrawal.disputeStatus,
        disputeReason: withdrawal.disputeReason,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not open dispute." },
      { status: 400 }
    );
  }
}
