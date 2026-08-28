import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { uploadImageBuffer } from "@/lib/cloudinary";
import {
  completeManualWithdrawal,
  serializeWithdrawalAdmin,
} from "@/lib/withdrawal-service";

type RouteCtx = { params: Promise<{ id: string }> };

const completeSchema = z.object({
  sessionId: z.string().trim().min(3).max(120),
  paidAmount: z.number().positive(),
  adminNote: z.string().trim().max(2000).optional(),
  transferReceiptUrl: z.string().url().optional(),
  transferReceiptPublicId: z.string().trim().optional(),
});

export async function POST(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertAdmin("users:write");
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid withdrawal." }, { status: 400 });
  }

  await connectDB();

  const contentType = req.headers.get("content-type") || "";
  let sessionId = "";
  let paidAmount = 0;
  let adminNote = "";
  let transferReceiptUrl = "";
  let transferReceiptPublicId = "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    sessionId = String(form.get("sessionId") || "").trim();
    paidAmount = Number(form.get("paidAmount") || 0);
    adminNote = String(form.get("adminNote") || "").trim();
    const file = form.get("receipt");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Transfer receipt file is required." },
        { status: 400 }
      );
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadImageBuffer(buffer, "nova-elite/withdrawals");
    transferReceiptUrl = uploaded.url;
    transferReceiptPublicId = uploaded.publicId;
  } else {
    const body = await req.json().catch(() => null);
    const parsed = completeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid completion payload." },
        { status: 400 }
      );
    }
    sessionId = parsed.data.sessionId;
    paidAmount = parsed.data.paidAmount;
    adminNote = parsed.data.adminNote || "";
    transferReceiptUrl = parsed.data.transferReceiptUrl || "";
    transferReceiptPublicId = parsed.data.transferReceiptPublicId || "";
    if (!transferReceiptUrl) {
      return NextResponse.json(
        { error: "transferReceiptUrl is required." },
        { status: 400 }
      );
    }
  }

  if (!sessionId || !paidAmount || !transferReceiptUrl) {
    return NextResponse.json(
      { error: "sessionId, paidAmount, and receipt are required." },
      { status: 400 }
    );
  }

  try {
    const withdrawal = await completeManualWithdrawal({
      withdrawalId: new mongoose.Types.ObjectId(id),
      adminUserId: user.id,
      sessionId,
      paidAmount,
      transferReceiptUrl,
      transferReceiptPublicId,
      adminNote,
    });

    return NextResponse.json({
      withdrawal: serializeWithdrawalAdmin(withdrawal),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not complete withdrawal.",
      },
      { status: 400 }
    );
  }
}
