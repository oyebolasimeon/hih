import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import {
  listPendingServiceDues,
  payServiceDueCharge,
} from "@/lib/service-due-pay";
import { Profile } from "@/models/Profile";

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const url = new URL(req.url);
  const profileId = url.searchParams.get("profileId") || "";
  const leaseId = url.searchParams.get("leaseId") || undefined;

  if (!profileId || !mongoose.Types.ObjectId.isValid(profileId)) {
    return NextResponse.json({ error: "profileId is required." }, { status: 400 });
  }
  if (leaseId && !mongoose.Types.ObjectId.isValid(leaseId)) {
    return NextResponse.json({ error: "Invalid lease." }, { status: 400 });
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

  const dues = await listPendingServiceDues({
    tenantProfileId: profile._id,
    leaseId,
  });

  return NextResponse.json({ dues });
}

const paySchema = z.object({
  chargeId: z.string().min(1),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = paySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "chargeId is required." }, { status: 400 });
  }

  await connectDB();

  try {
    const result = await payServiceDueCharge({
      chargeId: parsed.data.chargeId,
      userId: user.id,
    });

    await writeAudit({
      action: "payment.service_due",
      summary: result.instant
        ? `Service due paid instantly (${parsed.data.chargeId})`
        : `Initialized service due checkout (${parsed.data.chargeId})`,
      actor: actorFromUser(user),
      entityType: "payment",
      entityId: result.paymentId,
      metadata: { chargeId: parsed.data.chargeId, instant: result.instant },
      request: req,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not pay service due." },
      { status: 400 }
    );
  }
}
