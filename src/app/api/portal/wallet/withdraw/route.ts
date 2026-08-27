import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser } from "@/lib/audit";
import { requestWithdrawal, serializeWithdrawal } from "@/lib/wallet";

const withdrawSchema = z.object({
  profileId: z.string().min(1),
  amount: z.number().positive(),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid withdrawal request." },
      { status: 400 }
    );
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.profileId)) {
    return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
  }

  await connectDB();

  try {
    const result = await requestWithdrawal({
      profileId: new mongoose.Types.ObjectId(parsed.data.profileId),
      userId: user.id,
      amount: parsed.data.amount,
      actor: actorFromUser(user) || { kind: "user", name: user.name || "User" },
    });

    return NextResponse.json({
      withdrawal: serializeWithdrawal(result.withdrawal),
      wallet: {
        availableBalance: result.wallet.availableBalance,
        totalWithdrawn: result.wallet.totalWithdrawn,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Withdrawal failed." },
      { status: 400 }
    );
  }
}
