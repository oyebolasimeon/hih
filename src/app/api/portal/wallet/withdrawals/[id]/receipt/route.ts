import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { generateReceiptPdf, type ReceiptDocumentInput } from "@/lib/receipt-pdf";
import { Withdrawal } from "@/models/Withdrawal";
import { User } from "@/models/User";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid withdrawal." }, { status: 400 });
  }

  await connectDB();
  const withdrawal = await Withdrawal.findById(id);
  if (!withdrawal || String(withdrawal.userId) !== user.id) {
    return NextResponse.json({ error: "Withdrawal not found." }, { status: 404 });
  }
  if (withdrawal.status !== "completed") {
    return NextResponse.json(
      { error: "Receipt is available after completion." },
      { status: 409 }
    );
  }

  const dbUser = await User.findById(user.id).select("name email").lean();
  const input: ReceiptDocumentInput = {
    title: "Withdrawal receipt",
    receiptNumber: withdrawal.hihReceiptNumber || String(withdrawal._id),
    issuedAt: withdrawal.completedAt || new Date(),
    payerName: "House In Hand",
    payeeName: dbUser?.name || dbUser?.email || "Account holder",
    reference: withdrawal.providerRef,
    currency: withdrawal.currency,
    lines: [
      { label: "Withdrawal requested", amount: withdrawal.amount, kind: "subtotal" },
      { label: "Withdrawal fee", amount: withdrawal.fee, kind: "deduction" },
      {
        label: "Amount sent to bank",
        amount: withdrawal.paidAmount ?? withdrawal.netAmount,
        kind: "total",
      },
    ],
    totalAmount: withdrawal.paidAmount ?? withdrawal.netAmount,
    purposeLabel: "Wallet withdrawal",
    footerNote: withdrawal.sessionId
      ? `Bank session ID: ${withdrawal.sessionId}`
      : undefined,
  };

  const pdf = await generateReceiptPdf(input);
  const filename = `${withdrawal.hihReceiptNumber || withdrawal._id}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
