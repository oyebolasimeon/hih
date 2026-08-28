import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import {
  initializeAgreementFeePayment,
  resolveAgreementFeeEmail,
} from "@/lib/agreement-fee";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid agreement." }, { status: 400 });
  }

  await connectDB();
  const email = (await resolveAgreementFeeEmail(user.id)) || user.email || "";
  if (!email) {
    return NextResponse.json({ error: "Account email required." }, { status: 400 });
  }

  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const callbackUrl = `${appUrl}/portal/agreements?fee_paid=1`;

  try {
    const result = await initializeAgreementFeePayment({
      leaseId: new mongoose.Types.ObjectId(id),
      userId: user.id,
      email,
      callbackUrl,
    });

    await writeAudit({
      action: "agreement.fee_initialize",
      summary: `Initialized agreement fee of ${result.totalDue}`,
      actor: actorFromUser(user),
      entityType: "payment",
      entityId: String(result.payment._id),
      metadata: { leaseId: id, reference: result.payment.providerRef },
      request: req,
    });

    return NextResponse.json({
      paymentId: String(result.payment._id),
      reference: result.payment.providerRef,
      agreementFee: result.agreementFee,
      platformFee: result.platformFee,
      totalDue: result.totalDue,
      authorization_url: result.init.authorization_url,
      access_code: result.init.access_code,
      mock: "mock" in result.init ? result.init.mock : false,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not start agreement fee payment.",
      },
      { status: 400 }
    );
  }
}
