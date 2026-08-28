import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import {
  buildFullPaymentReceipt,
  fullReceiptToPdfInput,
} from "@/lib/receipt-document";
import { generateReceiptPdf } from "@/lib/receipt-pdf";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid payment." }, { status: 400 });
  }

  await connectDB();
  const receipt = await buildFullPaymentReceipt(id, user.id);
  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }

  const pdf = await generateReceiptPdf(fullReceiptToPdfInput(receipt));
  const filename = `${receipt.receiptNumber || receipt.paymentId}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
