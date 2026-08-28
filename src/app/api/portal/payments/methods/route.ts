import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { CARD_VERIFY_AMOUNT, serializePaymentMethod } from "@/lib/auto-pay";
import { paystackInitialize } from "@/lib/paystack";
import { PaymentMethod } from "@/models/PaymentMethod";
import { Profile } from "@/models/Profile";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId") || "";
  if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
    return NextResponse.json({ error: "profileId is required." }, { status: 400 });
  }

  await connectDB();
  const profile = await Profile.findOne({
    _id: profileId,
    userId: user.id,
    type: { $in: ["tenant", "student"] },
  });
  if (!profile) {
    return NextResponse.json({ error: "Tenant profile required." }, { status: 403 });
  }

  const methods = await PaymentMethod.find({
    profileId: profile._id,
    active: true,
  }).sort({ isDefault: -1, createdAt: -1 });

  return NextResponse.json({
    methods: methods.map(serializePaymentMethod),
  });
}

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const profileId = body?.profileId as string;
  if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
    return NextResponse.json({ error: "profileId is required." }, { status: 400 });
  }

  await connectDB();
  const profile = await Profile.findOne({
    _id: profileId,
    userId: user.id,
    type: { $in: ["tenant", "student"] },
  });
  if (!profile) {
    return NextResponse.json({ error: "Tenant profile required." }, { status: 403 });
  }

  const dbUser = await User.findById(user.id).select("email").lean();
  const email = dbUser?.email || user.email;
  if (!email) {
    return NextResponse.json({ error: "Account email required." }, { status: 400 });
  }

  const reference = `hih_card_${randomBytes(10).toString("hex")}`;
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  const callbackUrl = `${appUrl}/portal/payments?card=1`;

  await Payment.create({
    payerUserId: user.id,
    payerProfileId: profile._id,
    amount: CARD_VERIFY_AMOUNT,
    currency: "NGN",
    status: "pending",
    provider: "paystack",
    purpose: "card_verification",
    source: "paystack",
    providerRef: reference,
  });

  try {
    const init = await paystackInitialize({
      email,
      amountKobo: CARD_VERIFY_AMOUNT * 100,
      reference,
      callbackUrl,
      channels: ["card"],
      metadata: {
        type: "card_verification",
        profileId: String(profile._id),
        userId: user.id,
      },
    });

    return NextResponse.json({
      reference,
      authorization_url: init.authorization_url,
      verifyAmount: CARD_VERIFY_AMOUNT,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not start card setup." },
      { status: 502 }
    );
  }
}
