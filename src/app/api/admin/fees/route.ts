import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { DEFAULT_PLATFORM_FEES } from "@/lib/platform-fees";
import { SiteSettings } from "@/models/SiteSettings";

const feesSchema = z.object({
  agreementFeePercent: z.number().min(0).max(100).optional(),
  platformFeeMinPercent: z.number().min(0).max(100).optional(),
  platformFeePercentOwnLegal: z.number().min(0).max(100).optional(),
});

export async function GET() {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  await connectDB();
  const row = await SiteSettings.findOne({ key: "global" }).lean();
  const fees = {
    ...DEFAULT_PLATFORM_FEES,
    ...((row?.fees as object) || {}),
  };
  return NextResponse.json({ fees });
}

export async function PATCH(req: Request) {
  const { response } = await assertAdmin("content:write");
  if (response) return response;

  const body = await req.json().catch(() => null);
  const parsed = feesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fee settings." }, { status: 400 });
  }

  await connectDB();
  const row = await SiteSettings.findOneAndUpdate(
    { key: "global" },
    { $set: { fees: parsed.data } },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({
    fees: {
      ...DEFAULT_PLATFORM_FEES,
      ...((row?.fees as object) || {}),
    },
  });
}
