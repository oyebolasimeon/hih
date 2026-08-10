import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { FraudReport } from "@/models/FraudReport";
import { User } from "@/models/User";

export async function GET(req: Request) {
  const { response } = await assertAdmin("fraud:read");
  if (response) return response;

  await connectDB();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;

  const rows = await FraudReport.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const userIds = [...new Set(rows.map((r) => String(r.reporterUserId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email")
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return NextResponse.json({
    reports: rows.map((r) => {
      const u = userMap.get(String(r.reporterUserId));
      return {
        id: String(r._id),
        targetType: r.targetType,
        targetId: String(r.targetId),
        reason: r.reason,
        details: r.details || "",
        status: r.status,
        reporterName: u?.name || "",
        reporterEmail: u?.email || "",
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    }),
  });
}

const patchSchema = z.object({
  reportId: z.string().min(1),
  status: z.enum(["open", "reviewing", "resolved", "dismissed"]),
});

export async function PATCH(req: Request) {
  const { user, response } = await assertAdmin("fraud:write");
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload." }, { status: 400 });
  }

  await connectDB();
  const report = await FraudReport.findById(parsed.data.reportId);
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  const prev = report.status;
  report.status = parsed.data.status;
  await report.save();

  await writeAudit({
    action: "fraud.update",
    summary: `Fraud report ${prev} → ${parsed.data.status}`,
    actor: actorFromUser({ ...user, isAdmin: true }),
    entityType: "fraud_report",
    entityId: String(report._id),
    metadata: { previousStatus: prev, status: parsed.data.status },
    request: req,
  });

  return NextResponse.json({
    report: {
      id: String(report._id),
      status: report.status,
    },
  });
}
