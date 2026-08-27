import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { markPaymentSuccessful } from "@/lib/payment-complete";
import { paystackMockMode } from "@/lib/paystack";
import { Payment } from "@/models/Payment";

function verifySignature(rawBody: string, signature: string | null) {
  if (paystackMockMode()) return true;
  const secret = process.env.PAYSTACK_SECRET_KEY || "";
  if (!secret || !signature) return false;
  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: {
    event?: string;
    data?: { reference?: string; status?: string };
  };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (event.event !== "charge.success") {
    return NextResponse.json({ received: true, ignored: true });
  }

  const reference = event.data?.reference;
  if (!reference) {
    return NextResponse.json({ error: "Missing reference." }, { status: 400 });
  }

  await connectDB();
  const payment = await Payment.findOne({ providerRef: reference });
  if (!payment) {
    return NextResponse.json({ received: true, missing: true });
  }

  if (payment.status !== "successful") {
    await markPaymentSuccessful(payment);
    await writeAudit({
      action: "payment.webhook",
      summary: `Payment webhook marked ${reference} successful`,
      actor: { kind: "system", email: "payments@webhook", name: "Payments" },
      entityType: "payment",
      entityId: String(payment._id),
      metadata: { reference },
      request: req,
    });
  }

  return NextResponse.json({ received: true });
}
