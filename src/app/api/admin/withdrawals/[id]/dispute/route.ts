import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { resolveWithdrawalDispute } from "@/lib/withdrawal-service";

type RouteCtx = { params: Promise<{ id: string }> };

const schema = z.object({
  action: z.literal("resolve"),
  adminNote: z.string().trim().max(2000).optional(),
});

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertAdmin("users:write");
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid withdrawal." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid dispute action." }, { status: 400 });
  }

  await connectDB();

  try {
    const withdrawal = await resolveWithdrawalDispute({
      withdrawalId: new mongoose.Types.ObjectId(id),
      adminUserId: user.id,
      adminNote: parsed.data.adminNote,
    });
    return NextResponse.json({
      withdrawal: {
        id: String(withdrawal._id),
        disputeStatus: withdrawal.disputeStatus,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not resolve dispute." },
      { status: 400 }
    );
  }
}
