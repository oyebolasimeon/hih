import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Analytics } from "@/models/Analytics";

const schema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  revenue: z.number().min(0).optional(),
  commission: z.number().min(0).optional(),
  occupancyRate: z.number().min(0).max(100).optional(),
  channelBreakdown: z.record(z.string(), z.number()).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; analyticsId: string }> }
) {
  const { user, response } = await assertAdmin();
  if (response || !user) return response!;

  const { id, analyticsId } = await context.params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analytics data." }, { status: 400 });
  }

  const doc = await Analytics.findOneAndUpdate(
    { _id: analyticsId, investorId: id },
    parsed.data,
    { new: true }
  ).lean();

  if (!doc) {
    return NextResponse.json({ error: "Analytics entry not found." }, { status: 404 });
  }

  return NextResponse.json({
    analytics: {
      id: String(doc._id),
      period: doc.period,
      revenue: doc.revenue,
      commission: doc.commission,
      occupancyRate: doc.occupancyRate,
      channelBreakdown:
        doc.channelBreakdown instanceof Map
          ? Object.fromEntries(doc.channelBreakdown)
          : doc.channelBreakdown || {},
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; analyticsId: string }> }
) {
  const { user, response } = await assertAdmin();
  if (response || !user) return response!;

  const { id, analyticsId } = await context.params;
  const doc = await Analytics.findOneAndDelete({
    _id: analyticsId,
    investorId: id,
  });
  if (!doc) {
    return NextResponse.json({ error: "Analytics entry not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
