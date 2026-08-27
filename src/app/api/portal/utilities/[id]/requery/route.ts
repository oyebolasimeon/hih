import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { vtpassRequery } from "@/lib/vtpass";
import { UtilityBill } from "@/models/UtilityBill";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid bill." }, { status: 400 });
  }

  await connectDB();
  const bill = await UtilityBill.findOne({ _id: id, userId: user.id });
  if (!bill) {
    return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  }
  if (!bill.vtpassRequestId) {
    return NextResponse.json(
      { error: "No VTpass transaction to requery." },
      { status: 409 }
    );
  }

  try {
    const result = await vtpassRequery(bill.vtpassRequestId);
    bill.vtpassStatus = result.status;
    if (result.purchasedCode) {
      bill.purchaseToken = result.purchasedCode;
    }
    if (result.status === "delivered" && bill.status !== "paid") {
      bill.status = "paid";
      bill.paidAt = bill.paidAt || new Date();
    }
    await bill.save();

    return NextResponse.json({
      bill: {
        id: String(bill._id),
        status: bill.status,
        vtpassStatus: bill.vtpassStatus,
        purchaseToken: bill.purchaseToken || null,
        providerRef: bill.providerRef,
      },
      requery: result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Requery failed.",
      },
      { status: 502 }
    );
  }
}
