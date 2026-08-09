import { NextResponse } from "next/server";
import { assertInvestor } from "@/lib/api-auth";
import { AuditLog } from "@/models/AuditLog";

export async function GET(request: Request) {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 40), 100);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const skip = (page - 1) * limit;

  // Investor sees: events about their portfolio + their own actions
  const filter = {
    investorVisible: true,
    $or: [{ investorId: user.id }, { actorId: user.id }],
  };

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(filter),
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return NextResponse.json({
    total,
    page,
    limit,
    logs: logs.map((l) => ({
      id: String(l._id),
      action: l.action,
      summary: l.summary,
      actorEmail: l.actorEmail || "",
      actorName: l.actorName || "",
      actorKind: l.actorKind,
      entityType: l.entityType || "",
      entityId: l.entityId || "",
      changes: l.changes || [],
      createdAt: l.createdAt,
      // Don't expose admin IP/UA to investors
    })),
  });
}
