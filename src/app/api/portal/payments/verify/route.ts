import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { markPaymentSuccessful } from "@/lib/payment-complete";
import { paystackVerify } from "@/lib/paystack";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const url = new URL(req.url);
  const reference = url.searchParams.get("reference") || "";
  if (!reference) {
    return NextResponse.json({ error: "reference is required." }, { status: 400 });
  }

  await connectDB();
  const payment = await Payment.findOne({ providerRef: reference });
  if (!payment) {
    return NextResponse.json({ error: "Payment not found." }, { status: 404 });
  }

  const profiles = await Profile.find({ userId: user.id }).select("_id").lean();
  const profileIds = new Set(profiles.map((p) => String(p._id)));
  const isPayer = String(payment.payerUserId) === user.id;
  const isPayee =
    payment.payeeProfileId && profileIds.has(String(payment.payeeProfileId));
  if (!isPayer && !isPayee) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (payment.status === "successful") {
    return NextResponse.json({
      payment: {
        id: String(payment._id),
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.paidAt,
        receiptUrl: payment.receiptUrl,
        providerRef: payment.providerRef,
      },
    });
  }

  try {
    const verified = await paystackVerify(reference);
    if (verified.status !== "success") {
      payment.status = "failed";
      await payment.save();
      return NextResponse.json(
        { error: "Payment was not successful.", status: verified.status },
        { status: 402 }
      );
    }

    await markPaymentSuccessful(payment);

    await writeAudit({
      action: "payment.verify",
      summary: `Verified payment ${reference}`,
      actor: actorFromUser(user),
      entityType: "payment",
      entityId: String(payment._id),
      metadata: { reference },
      request: req,
    });

    return NextResponse.json({
      payment: {
        id: String(payment._id),
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.paidAt,
        receiptUrl: payment.receiptUrl,
        providerRef: payment.providerRef,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Verification failed.",
      },
      { status: 502 }
    );
  }
}
