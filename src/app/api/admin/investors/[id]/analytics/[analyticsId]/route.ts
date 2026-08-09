import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Analytics } from "@/models/Analytics";
import {
  actorFromUser,
  diffObjects,
  leanDoc,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

const schema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  revenue: z.number().min(0).optional(),
  commission: z.number().min(0).optional(),
  occupancyRate: z.number().min(0).max(100).optional(),
  channelBreakdown: z.record(z.string(), z.number()).optional(),
});

function breakdownOf(value: unknown): Record<string, number> {
  if (value instanceof Map) return Object.fromEntries(value);
  if (value && typeof value === "object") {
    return value as Record<string, number>;
  }
  return {};
}

function normalizeAnalytics(
  doc: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  const base = leanDoc(doc);
  if (!base) return null;
  return {
    ...base,
    channelBreakdown: breakdownOf(doc?.channelBreakdown),
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; analyticsId: string }> }
) {
  const { user, response } = await assertAdmin("analytics:write");
  if (response || !user) return response!;

  const { id, analyticsId } = await context.params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analytics data." }, { status: 400 });
  }

  const before = await Analytics.findOne({
    _id: analyticsId,
    investorId: id,
  }).lean();
  if (!before) {
    return NextResponse.json({ error: "Analytics entry not found." }, { status: 404 });
  }

  const doc = await Analytics.findOneAndUpdate(
    { _id: analyticsId, investorId: id },
    parsed.data,
    { new: true }
  ).lean();

  if (!doc) {
    return NextResponse.json({ error: "Analytics entry not found." }, { status: 404 });
  }

  await writeAudit({
    action: "analytics.update",
    summary: `Updated analytics for ${doc.period}`,
    actor: actorFromUser(user),
    entityType: "Analytics",
    entityId: String(doc._id),
    investorId: id,
    investorVisible: true,
    changes: diffObjects(normalizeAnalytics(before), normalizeAnalytics(doc), [
      "period",
      "revenue",
      "commission",
      "occupancyRate",
      "channelBreakdown",
    ]),
    request,
  });

  return NextResponse.json({
    analytics: {
      id: String(doc._id),
      period: doc.period,
      revenue: doc.revenue,
      commission: doc.commission,
      occupancyRate: doc.occupancyRate,
      channelBreakdown: breakdownOf(doc.channelBreakdown),
    },
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string; analyticsId: string }> }
) {
  const { user, response } = await assertAdmin("analytics:write");
  if (response || !user) return response!;

  const { id, analyticsId } = await context.params;
  const doc = await Analytics.findOneAndDelete({
    _id: analyticsId,
    investorId: id,
  });
  if (!doc) {
    return NextResponse.json({ error: "Analytics entry not found." }, { status: 404 });
  }

  await writeAudit({
    action: "analytics.delete",
    summary: `Deleted analytics for ${doc.period}`,
    actor: actorFromUser(user),
    entityType: "Analytics",
    entityId: String(doc._id),
    investorId: id,
    investorVisible: true,
    changes: [
      {
        field: "analytics",
        oldValue: sanitizeAuditValue({
          period: doc.period,
          revenue: doc.revenue,
          commission: doc.commission,
          occupancyRate: doc.occupancyRate,
          channelBreakdown: breakdownOf(doc.channelBreakdown),
        }),
        newValue: null,
      },
    ],
    request,
  });

  return NextResponse.json({ success: true });
}
