import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { InvestmentInterest } from "@/models/InvestmentInterest";
import { Property } from "@/models/Property";
import { Investor } from "@/models/Investor";
import {
  actorFromUser,
  diffObjects,
  writeAudit,
} from "@/lib/audit";

export async function GET(request: Request) {
  const { response } = await assertAdmin("investors:read");
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "";
  const propertyId = searchParams.get("propertyId") || "";

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (propertyId) filter.propertyId = propertyId;

  const rows = await InvestmentInterest.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const investorIds = [...new Set(rows.map((r) => String(r.investorId)))];
  const propertyIds = [...new Set(rows.map((r) => String(r.propertyId)))];

  const [investors, properties] = await Promise.all([
    Investor.find({ _id: { $in: investorIds } }).select("name email").lean(),
    Property.find({ _id: { $in: propertyIds } }).select("name address").lean(),
  ]);

  const invMap = new Map(investors.map((i) => [String(i._id), i]));
  const propMap = new Map(properties.map((p) => [String(p._id), p]));

  return NextResponse.json({
    interests: rows.map((r) => {
      const inv = invMap.get(String(r.investorId));
      const prop = propMap.get(String(r.propertyId));
      return {
        id: String(r._id),
        amount: r.amount,
        status: r.status,
        projectedProfit: r.projectedProfit,
        projectedTotalReturn: r.projectedTotalReturn,
        annualizedRoiPercent: r.annualizedRoiPercent,
        monthlyAverageProfit: r.monthlyAverageProfit,
        multiple: r.multiple,
        roiMode: r.roiMode,
        roiValue: r.roiValue,
        roiPeriodMonths: r.roiPeriodMonths,
        note: r.note || "",
        adminNote: r.adminNote || "",
        createdAt: r.createdAt,
        investorId: String(r.investorId),
        investorName: inv?.name || "Unknown",
        investorEmail: inv?.email || "",
        propertyId: String(r.propertyId),
        propertyName: prop?.name || "Unknown",
        propertyAddress: prop?.address || "",
      };
    }),
  });
}

const updateSchema = z.object({
  status: z
    .enum(["pending", "contacted", "accepted", "withdrawn", "rejected"])
    .optional(),
  adminNote: z.string().trim().max(2000).optional(),
});

export async function PATCH(request: Request) {
  const { user, response } = await assertAdmin("investors:write");
  if (response || !user) return response!;

  const body = await request.json();
  const id = String(body.id || "");
  const parsed = updateSchema.safeParse(body);
  if (!id || !parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  const before = await InvestmentInterest.findById(id).lean();
  if (!before) {
    return NextResponse.json({ error: "Interest not found." }, { status: 404 });
  }

  const updated = await InvestmentInterest.findByIdAndUpdate(
    id,
    parsed.data,
    { new: true }
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Interest not found." }, { status: 404 });
  }

  await writeAudit({
    action: "investment.interest_update",
    summary: `Updated investment interest status to ${updated.status}`,
    actor: actorFromUser(user),
    entityType: "InvestmentInterest",
    entityId: String(updated._id),
    investorId: String(updated.investorId),
    investorVisible: true,
    changes: diffObjects(
      {
        status: before.status,
        adminNote: before.adminNote || "",
      },
      {
        status: updated.status,
        adminNote: updated.adminNote || "",
      },
      ["status", "adminNote"]
    ),
    request,
  });

  return NextResponse.json({
    interest: {
      id: String(updated._id),
      status: updated.status,
      adminNote: updated.adminNote || "",
    },
  });
}
