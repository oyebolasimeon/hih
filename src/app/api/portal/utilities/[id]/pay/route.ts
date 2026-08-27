import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { paystackInitialize } from "@/lib/paystack";
import { UtilityBill } from "@/models/UtilityBill";
import { User } from "@/models/User";

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
  if (bill.status === "paid") {
    return NextResponse.json({ error: "Bill already paid." }, { status: 409 });
  }

  const dbUser = await User.findById(user.id).select("email").lean();
  const email = dbUser?.email || user.email;
  if (!email) {
    return NextResponse.json({ error: "Account email required." }, { status: 400 });
  }

  const reference = `utl_${randomBytes(12).toString("hex")}`;
  const amountKobo = Math.round(bill.amount * 100);
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const callbackUrl = `${appUrl}/portal/utilities?paid=1`;

  bill.paystackRef = reference;
  await bill.save();

  try {
    const init = await paystackInitialize({
      email,
      amountKobo,
      reference,
      callbackUrl,
      metadata: {
        utilityBillId: String(bill._id),
        userId: user.id,
        category: bill.category,
        providerId: bill.providerId,
      },
    });

    return NextResponse.json({
      billId: String(bill._id),
      reference,
      authorization_url: init.authorization_url,
      access_code: init.access_code,
      mock: "mock" in init ? init.mock : false,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not initialize payment.",
      },
      { status: 502 }
    );
  }
}
