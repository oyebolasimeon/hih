import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { paystackInitialize } from "@/lib/paystack";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

const depositSchema = z.object({
  profileId: z.string().min(1),
  amount: z.number().positive(),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = depositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid deposit request." },
      { status: 400 }
    );
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.profileId)) {
    return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
  }

  await connectDB();
  const profile = await Profile.findOne({
    _id: parsed.data.profileId,
    userId: user.id,
  });
  if (!profile || !["tenant", "student"].includes(profile.type)) {
    return NextResponse.json(
      { error: "Only tenant profiles can deposit to a wallet." },
      { status: 403 }
    );
  }

  const dbUser = await User.findById(user.id).select("email").lean();
  const email = dbUser?.email || user.email;
  if (!email) {
    return NextResponse.json({ error: "Account email required." }, { status: 400 });
  }

  const reference = `dep_${randomBytes(12).toString("hex")}`;
  const amountKobo = Math.round(parsed.data.amount * 100);
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const callbackUrl = `${appUrl}/portal/payments?deposit=1`;

  const payment = await Payment.create({
    payerUserId: user.id,
    payerProfileId: profile._id,
    amount: parsed.data.amount,
    currency: "NGN",
    status: "pending",
    provider: "paystack",
    purpose: "wallet_deposit",
    source: "paystack",
    providerRef: reference,
  });

  try {
    const init = await paystackInitialize({
      email,
      amountKobo,
      reference,
      callbackUrl,
      metadata: {
        paymentId: String(payment._id),
        profileId: String(profile._id),
        purpose: "wallet_deposit",
      },
    });

    await writeAudit({
      action: "wallet.deposit_initialize",
      summary: `Initialized wallet deposit of NGN ${parsed.data.amount}`,
      actor: actorFromUser(user),
      entityType: "payment",
      entityId: String(payment._id),
      metadata: { reference, profileId: String(profile._id) },
      request: req,
    });

    return NextResponse.json({
      paymentId: String(payment._id),
      reference,
      authorization_url: init.authorization_url,
      access_code: init.access_code,
      mock: "mock" in init ? init.mock : false,
    });
  } catch (err) {
    payment.status = "failed";
    await payment.save();
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Could not start deposit.",
      },
      { status: 502 }
    );
  }
}
