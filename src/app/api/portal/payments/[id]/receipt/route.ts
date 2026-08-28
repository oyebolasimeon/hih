import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { buildFullPaymentReceipt } from "@/lib/receipt-document";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid payment." }, { status: 400 });
  }

  try {
    await connectDB();
    const receipt = await buildFullPaymentReceipt(id, user.id);
    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
    }

    return NextResponse.json({ receipt });
  } catch (err) {
    console.error("payment receipt error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load receipt." },
      { status: 500 }
    );
  }
}
