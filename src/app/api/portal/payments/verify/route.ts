import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { markPaymentSuccessful } from "@/lib/payment-complete";
import { savePaymentMethodFromAuthorization } from "@/lib/auto-pay";
import { paystackVerify } from "@/lib/paystack";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";
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
        purpose: payment.purpose,
        amount: payment.amount,
        currency: payment.currency,
        paidAt: payment.paidAt,
        receiptUrl: payment.receiptUrl,
        receiptNumber: payment.receiptNumber,
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

    if (payment.purpose === "card_verification") {
      if (!payment.payerProfileId) {
        return NextResponse.json({ error: "Invalid card verification." }, { status: 400 });
      }
      const dbUser = await User.findById(user.id).select("email").lean();
      const email = dbUser?.email || user.email || "";
      const authorization =
        verified.authorization ||
        ({
          authorization_code: `AUTH_mock_${reference.slice(-12)}`,
          card_type: "visa",
          last4: "4081",
          exp_month: "12",
          exp_year: "2030",
          bank: "TEST BANK",
          reusable: true,
        } as const);

      const method = await savePaymentMethodFromAuthorization({
        userId: user.id,
        profileId: payment.payerProfileId,
        email,
        authorization,
      });

      payment.status = "successful";
      payment.paidAt = new Date();
      await payment.save();

      return NextResponse.json({
        payment: {
          id: String(payment._id),
          status: payment.status,
          purpose: payment.purpose,
        },
        paymentMethod: {
          id: String(method._id),
          last4: method.last4,
          cardType: method.cardType,
        },
      });
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
        receiptNumber: payment.receiptNumber,
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
