import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser } from "@/lib/audit";
import { refundRentPayment } from "@/lib/wallet";
import { Profile } from "@/models/Profile";

type RouteCtx = { params: Promise<{ id: string }> };

const refundSchema = z.object({
  profileId: z.string().min(1),
  reason: z.string().trim().min(10).max(2000),
});

export async function POST(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid payment." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = refundSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid refund request." },
      { status: 400 }
    );
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.profileId)) {
    return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
  }

  await connectDB();

  const profile = await Profile.findOne({
    _id: parsed.data.profileId,
    userId: user.id,
    type: { $in: ["landlord", "estate_manager"] },
  });
  if (!profile) {
    return NextResponse.json(
      { error: "Landlord profile required to issue refunds." },
      { status: 403 }
    );
  }

  try {
    const result = await refundRentPayment({
      paymentId: new mongoose.Types.ObjectId(id),
      landlordUserId: user.id,
      landlordProfileId: profile._id,
      reason: parsed.data.reason,
      actor: actorFromUser(user) || { kind: "user", name: user.name || "User" },
    });

    return NextResponse.json({
      payment: {
        id: String(result.payment._id),
        status: result.payment.status,
        refundAmount: result.payment.refundAmount,
        refundedAt: result.payment.refundedAt,
        refundReason: result.payment.refundReason,
      },
      wallet: {
        availableBalance: result.landlordWallet.availableBalance,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Refund failed." },
      { status: 400 }
    );
  }
}
