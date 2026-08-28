import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import {
  DEFAULT_PAYOUT_SETTINGS,
  type PayoutProvider,
  type PayoutSettings,
} from "@/lib/payout-settings";
import { SiteSettings } from "@/models/SiteSettings";

const schema = z.object({
  provider: z.enum(["paystack", "manual"]).optional(),
  withdrawalFee: z.number().min(0).max(100000).optional(),
});

export async function GET() {
  const { response } = await assertAdmin("users:read");
  if (response) return response;

  await connectDB();
  const row = await SiteSettings.findOne({ key: "global" }).lean();
  const payout = (row?.payoutSettings || {}) as {
    provider?: PayoutProvider;
    withdrawalFee?: number;
  };

  return NextResponse.json({
    payoutSettings: {
      provider:
        payout.provider === "manual" ? "manual" : DEFAULT_PAYOUT_SETTINGS.provider,
      withdrawalFee:
        typeof payout.withdrawalFee === "number"
          ? payout.withdrawalFee
          : DEFAULT_PAYOUT_SETTINGS.withdrawalFee,
    },
  });
}

export async function PATCH(req: Request) {
  const { response } = await assertAdmin("users:write");
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payout settings." }, { status: 400 });
  }

  await connectDB();
  const row = await SiteSettings.findOne({ key: "global" }).lean();
  const current = (row?.payoutSettings || {}) as Partial<PayoutSettings>;
  const next = {
    provider:
      parsed.data.provider ??
      (current.provider === "manual" ? "manual" : DEFAULT_PAYOUT_SETTINGS.provider),
    withdrawalFee:
      parsed.data.withdrawalFee ??
      (typeof current.withdrawalFee === "number"
        ? current.withdrawalFee
        : DEFAULT_PAYOUT_SETTINGS.withdrawalFee),
  };

  const updated = await SiteSettings.findOneAndUpdate(
    { key: "global" },
    { $set: { payoutSettings: next } },
    { upsert: true, new: true }
  ).lean();

  const payout = (updated?.payoutSettings || {}) as Partial<PayoutSettings>;

  return NextResponse.json({
    payoutSettings: {
      provider: payout.provider === "manual" ? "manual" : "paystack",
      withdrawalFee:
        typeof payout.withdrawalFee === "number"
          ? payout.withdrawalFee
          : DEFAULT_PAYOUT_SETTINGS.withdrawalFee,
    },
  });
}
