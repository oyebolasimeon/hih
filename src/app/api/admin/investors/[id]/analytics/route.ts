import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { Analytics } from "@/models/Analytics";

const schema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  revenue: z.number().min(0).default(0),
  commission: z.number().min(0).default(0),
  occupancyRate: z.number().min(0).max(100).default(0),
  channelBreakdown: z.record(z.string(), z.number()).default({}),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin();
  if (response || !user) return response!;

  const { id: investorId } = await context.params;
  const investor = await Investor.findById(investorId);
  if (!investor) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid analytics data. Period must be YYYY-MM." },
      { status: 400 }
    );
  }

  const doc = await Analytics.findOneAndUpdate(
    { investorId, period: parsed.data.period },
    {
      ...parsed.data,
      channelBreakdown: parsed.data.channelBreakdown,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return NextResponse.json({
    analytics: {
      id: String(doc!._id),
      period: doc!.period,
      revenue: doc!.revenue,
      commission: doc!.commission,
      occupancyRate: doc!.occupancyRate,
      channelBreakdown:
        doc!.channelBreakdown instanceof Map
          ? Object.fromEntries(doc!.channelBreakdown)
          : doc!.channelBreakdown || {},
    },
  });
}
