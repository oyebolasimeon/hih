import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { notifyUser } from "@/lib/profile-context";
import { paystackVerify } from "@/lib/paystack";
import { vtpassPay, vtpassRequestId } from "@/lib/vtpass";
import { UtilityBill } from "@/models/UtilityBill";
import { User } from "@/models/User";

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const url = new URL(req.url);
  const reference = url.searchParams.get("reference") || "";
  if (!reference) {
    return NextResponse.json({ error: "reference is required." }, { status: 400 });
  }

  await connectDB();
  const bill = await UtilityBill.findOne({
    paystackRef: reference,
    userId: user.id,
  });
  if (!bill) {
    return NextResponse.json({ error: "Bill not found." }, { status: 404 });
  }

  if (bill.status === "paid") {
    return NextResponse.json({
      bill: {
        id: String(bill._id),
        status: bill.status,
        amount: bill.amount,
        currency: bill.currency,
        category: bill.category,
        provider: bill.provider,
        purchaseToken: bill.purchaseToken || null,
        paidAt: bill.paidAt,
        providerRef: bill.providerRef,
      },
    });
  }

  try {
    const verified = await paystackVerify(reference);
    if (verified.status !== "success") {
      bill.status = "failed";
      await bill.save();
      return NextResponse.json(
        { error: "Payment was not successful.", status: verified.status },
        { status: 402 }
      );
    }

    let purchaseToken: string | null = null;
    let providerRef = reference;

    if (bill.integration === "vtpass" && bill.phone) {
      const requestId = vtpassRequestId();
      const vtpass = await vtpassPay({
        requestId,
        serviceID: bill.providerId,
        billersCode: bill.accountNumber,
        amount: bill.amount,
        phone: bill.phone,
        variationCode: bill.meterType,
      });
      bill.vtpassRequestId = vtpass.requestId;
      purchaseToken = vtpass.token;
      providerRef = vtpass.requestId;
    }

    bill.status = "paid";
    bill.paidAt = new Date();
    bill.providerRef = providerRef;
    bill.purchaseToken = purchaseToken || undefined;
    await bill.save();

    const dbUser = await User.findById(user.id).select("email name").lean();
    const tokenNote = purchaseToken
      ? ` Token: ${purchaseToken}`
      : "";
    await notifyUser({
      userId: user.id,
      type: "utility.paid",
      title: "Utility bill paid",
      body: `Your ${bill.category.replace("_", " ")} payment to ${bill.provider} (NGN ${bill.amount.toLocaleString()}) was successful.${tokenNote}`,
      link: "/portal/utilities",
      meta: {
        billId: String(bill._id),
        providerRef: bill.providerRef,
        purchaseToken,
      },
      email: dbUser?.email
        ? { to: dbUser.email, subject: "Utility payment confirmed" }
        : undefined,
    });

    return NextResponse.json({
      bill: {
        id: String(bill._id),
        status: bill.status,
        amount: bill.amount,
        currency: bill.currency,
        category: bill.category,
        provider: bill.provider,
        purchaseToken: bill.purchaseToken || null,
        paidAt: bill.paidAt,
        providerRef: bill.providerRef,
        mock:
          "mock" in verified
            ? verified.mock
            : bill.integration === "vtpass",
      },
    });
  } catch (err) {
    bill.status = "failed";
    await bill.save();
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Payment succeeded but utility fulfillment failed. Contact support.",
      },
      { status: 502 }
    );
  }
}
