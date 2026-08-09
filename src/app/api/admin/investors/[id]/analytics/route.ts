import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { Analytics } from "@/models/Analytics";
import {
  actorFromUser,
  diffObjects,
  leanDoc,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

const schema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  revenue: z.number().min(0).default(0),
  commission: z.number().min(0).default(0),
  occupancyRate: z.number().min(0).max(100).default(0),
  avgNightlyRate: z.number().min(0).default(0),
  revenuePAL: z.number().min(0).default(0),
  channelBreakdown: z.record(z.string(), z.number()).default({}),
});

function breakdownOf(
  value: unknown
): Record<string, number> {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value && typeof value === "object") {
    return value as Record<string, number>;
  }
  return {};
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("analytics:write");
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

  const before = await Analytics.findOne({
    investorId,
    period: parsed.data.period,
  }).lean();

  const doc = await Analytics.findOneAndUpdate(
    { investorId, period: parsed.data.period },
    {
      ...parsed.data,
      channelBreakdown: parsed.data.channelBreakdown,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  const afterBreakdown = breakdownOf(doc!.channelBreakdown);
  const beforeLean = before
    ? {
        ...leanDoc(before),
        channelBreakdown: breakdownOf(before.channelBreakdown),
      }
    : null;
  const afterLean = {
    ...leanDoc(doc!),
    channelBreakdown: afterBreakdown,
  };

  if (before) {
    await writeAudit({
      action: "analytics.update",
      summary: `Updated analytics for ${parsed.data.period}`,
      actor: actorFromUser(user),
      entityType: "Analytics",
      entityId: String(doc!._id),
      investorId,
      investorVisible: true,
      changes: diffObjects(beforeLean, afterLean, [
        "period",
        "revenue",
        "commission",
        "occupancyRate",
        "avgNightlyRate",
        "revenuePAL",
        "channelBreakdown",
      ]),
      request,
    });
  } else {
    await writeAudit({
      action: "analytics.create",
      summary: `Created analytics for ${parsed.data.period}`,
      actor: actorFromUser(user),
      entityType: "Analytics",
      entityId: String(doc!._id),
      investorId,
      investorVisible: true,
      changes: [
        {
          field: "analytics",
          oldValue: null,
          newValue: sanitizeAuditValue({
            period: doc!.period,
            revenue: doc!.revenue,
            commission: doc!.commission,
            occupancyRate: doc!.occupancyRate,
            avgNightlyRate: doc!.avgNightlyRate,
            revenuePAL: doc!.revenuePAL,
            channelBreakdown: afterBreakdown,
          }),
        },
      ],
      request,
    });
  }

  return NextResponse.json({
    analytics: {
      id: String(doc!._id),
      period: doc!.period,
      revenue: doc!.revenue,
      commission: doc!.commission,
      occupancyRate: doc!.occupancyRate,
      avgNightlyRate: doc!.avgNightlyRate,
      revenuePAL: doc!.revenuePAL,
      channelBreakdown: afterBreakdown,
    },
  });
}
