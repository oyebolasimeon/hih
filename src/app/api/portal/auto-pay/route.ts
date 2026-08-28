import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { processAutoPayForSetting } from "@/lib/auto-pay";
import { AutoPaySetting } from "@/models/AutoPaySetting";
import { Lease } from "@/models/Lease";
import { Profile } from "@/models/Profile";

const patchSchema = z.object({
  leaseId: z.string().min(1),
  enabled: z.boolean().optional(),
  includeRent: z.boolean().optional(),
  includeServiceDues: z.boolean().optional(),
  paymentMethodId: z.string().nullable().optional(),
});

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const url = new URL(req.url);
  const leaseId = url.searchParams.get("leaseId") || "";
  if (!leaseId || !mongoose.Types.ObjectId.isValid(leaseId)) {
    return NextResponse.json({ error: "leaseId is required." }, { status: 400 });
  }

  await connectDB();
  const lease = await Lease.findById(leaseId);
  if (!lease) {
    return NextResponse.json({ error: "Lease not found." }, { status: 404 });
  }

  const tenantProfile = await Profile.findOne({
    _id: lease.tenantProfileId,
    userId: user.id,
  });
  if (!tenantProfile) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const setting =
    (await AutoPaySetting.findOne({ leaseId: lease._id })) ||
    (await AutoPaySetting.create({
      leaseId: lease._id,
      tenantProfileId: tenantProfile._id,
      tenantUserId: user.id,
      enabled: false,
      includeRent: true,
      includeServiceDues: true,
    }));

  return NextResponse.json({
    autoPay: {
      enabled: setting.enabled,
      includeRent: setting.includeRent,
      includeServiceDues: setting.includeServiceDues,
      paymentMethodId: setting.paymentMethodId
        ? String(setting.paymentMethodId)
        : null,
      lastRunAt: setting.lastRunAt || null,
      lastRunStatus: setting.lastRunStatus || null,
      lastRunError: setting.lastRunError || null,
    },
  });
}

export async function PATCH(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid auto-pay settings." }, { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.leaseId)) {
    return NextResponse.json({ error: "Invalid lease." }, { status: 400 });
  }

  await connectDB();
  const lease = await Lease.findById(parsed.data.leaseId);
  if (!lease) {
    return NextResponse.json({ error: "Lease not found." }, { status: 404 });
  }

  const tenantProfile = await Profile.findOne({
    _id: lease.tenantProfileId,
    userId: user.id,
  });
  if (!tenantProfile) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const setting = await AutoPaySetting.findOneAndUpdate(
    { leaseId: lease._id },
    {
      $setOnInsert: {
        tenantProfileId: tenantProfile._id,
        tenantUserId: user.id,
      },
      $set: {
        ...(parsed.data.enabled !== undefined
          ? { enabled: parsed.data.enabled }
          : {}),
        ...(parsed.data.includeRent !== undefined
          ? { includeRent: parsed.data.includeRent }
          : {}),
        ...(parsed.data.includeServiceDues !== undefined
          ? { includeServiceDues: parsed.data.includeServiceDues }
          : {}),
        ...(parsed.data.paymentMethodId !== undefined
          ? {
              paymentMethodId:
                parsed.data.paymentMethodId &&
                mongoose.Types.ObjectId.isValid(parsed.data.paymentMethodId)
                  ? new mongoose.Types.ObjectId(parsed.data.paymentMethodId)
                  : undefined,
            }
          : {}),
      },
    },
    { upsert: true, new: true }
  );

  return NextResponse.json({
    autoPay: {
      enabled: setting.enabled,
      includeRent: setting.includeRent,
      includeServiceDues: setting.includeServiceDues,
      paymentMethodId: setting.paymentMethodId
        ? String(setting.paymentMethodId)
        : null,
      lastRunAt: setting.lastRunAt || null,
      lastRunStatus: setting.lastRunStatus || null,
      lastRunError: setting.lastRunError || null,
    },
  });
}

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const leaseId = body?.leaseId as string;
  if (!leaseId || !mongoose.Types.ObjectId.isValid(leaseId)) {
    return NextResponse.json({ error: "leaseId is required." }, { status: 400 });
  }

  await connectDB();
  const lease = await Lease.findById(leaseId);
  if (!lease) {
    return NextResponse.json({ error: "Lease not found." }, { status: 404 });
  }

  const tenantProfile = await Profile.findOne({
    _id: lease.tenantProfileId,
    userId: user.id,
  });
  if (!tenantProfile) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let setting = await AutoPaySetting.findOne({ leaseId: lease._id });
  if (!setting) {
    setting = await AutoPaySetting.create({
      leaseId: lease._id,
      tenantProfileId: tenantProfile._id,
      tenantUserId: user.id,
      enabled: true,
      includeRent: true,
      includeServiceDues: true,
    });
  }

  try {
    const result = await processAutoPayForSetting(setting);
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Auto-pay run failed." },
      { status: 400 }
    );
  }
}
