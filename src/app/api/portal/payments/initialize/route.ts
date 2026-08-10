import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { paystackInitialize } from "@/lib/paystack";
import { Lease } from "@/models/Lease";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

const initSchema = z.object({
  leaseId: z.string().min(1),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = initSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "leaseId is required." }, { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.leaseId)) {
    return NextResponse.json({ error: "Invalid lease." }, { status: 400 });
  }

  await connectDB();
  const lease = await Lease.findById(parsed.data.leaseId);
  if (!lease) {
    return NextResponse.json({ error: "Lease not found." }, { status: 404 });
  }
  if (lease.status !== "active") {
    return NextResponse.json(
      { error: "Lease must be active before paying rent." },
      { status: 409 }
    );
  }

  const tenantProfile = await Profile.findOne({
    _id: lease.tenantProfileId,
    userId: user.id,
  });
  if (!tenantProfile) {
    return NextResponse.json(
      { error: "Only the tenant on this lease can initiate payment." },
      { status: 403 }
    );
  }

  const dbUser = await User.findById(user.id).select("email").lean();
  const email = dbUser?.email || user.email;
  if (!email) {
    return NextResponse.json({ error: "Account email required." }, { status: 400 });
  }

  const reference = `hih_${randomBytes(12).toString("hex")}`;
  const amountKobo = Math.round(lease.rentAmount * 100);
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const callbackUrl = `${appUrl}/portal/payments?paid=1`;

  const payment = await Payment.create({
    leaseId: lease._id,
    listingId: lease.listingId,
    payerUserId: user.id,
    payeeProfileId: lease.landlordProfileId,
    amount: lease.rentAmount,
    currency: lease.currency || "NGN",
    status: "pending",
    provider: "paystack",
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
        leaseId: String(lease._id),
        userId: user.id,
      },
    });

    await writeAudit({
      action: "payment.initialize",
      summary: `Initialized rent payment of ${lease.currency} ${lease.rentAmount}`,
      actor: actorFromUser(user),
      entityType: "payment",
      entityId: String(payment._id),
      metadata: { reference, leaseId: String(lease._id) },
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
        error:
          err instanceof Error ? err.message : "Could not initialize payment.",
      },
      { status: 502 }
    );
  }
}
