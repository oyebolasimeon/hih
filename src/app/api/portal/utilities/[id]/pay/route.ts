import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { notifyUser } from "@/lib/profile-context";
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

  const mockMode =
    process.env.PAYSTACK_MOCK === "1" ||
    process.env.PAYSTACK_MOCK === "true" ||
    !process.env.PAYSTACK_SECRET_KEY ||
    process.env.PAYSTACK_SECRET_KEY === "mock";

  const ref = `UTL_${Date.now()}_${String(bill._id).slice(-6)}`;
  bill.status = "paid";
  bill.providerRef = mockMode ? `mock_${ref}` : ref;
  bill.paidAt = new Date();
  await bill.save();

  const dbUser = await User.findById(user.id).select("email name").lean();
  await notifyUser({
    userId: user.id,
    type: "utility.paid",
    title: "Utility bill paid",
    body: `Your ${bill.category.replace("_", " ")} bill to ${bill.provider} (NGN ${bill.amount.toLocaleString()}) was marked paid.`,
    link: "/portal/utilities",
    meta: { billId: String(bill._id), providerRef: bill.providerRef },
    email: dbUser?.email
      ? { to: dbUser.email, subject: "Utility payment confirmed" }
      : undefined,
  });

  return NextResponse.json({
    bill: {
      id: String(bill._id),
      status: bill.status,
      providerRef: bill.providerRef,
      paidAt: bill.paidAt,
      amount: bill.amount,
      currency: bill.currency,
      category: bill.category,
      provider: bill.provider,
      mock: mockMode,
    },
  });
}
