import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import { AuditLog } from "@/models/AuditLog";

export async function GET(request: Request) {
  const { response } = await assertAdmin("audit:read");
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const action = (searchParams.get("action") || "").trim();
  const actorKind = (searchParams.get("actorKind") || "").trim();
  const investorId = (searchParams.get("investorId") || "").trim();
  const entityType = (searchParams.get("entityType") || "").trim();
  const limit = Math.min(Number(searchParams.get("limit") || 50), 200);
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {};
  if (action) filter.action = action;
  if (actorKind) filter.actorKind = actorKind;
  if (investorId) filter.investorId = investorId;
  if (entityType) filter.entityType = entityType;
  if (q) {
    filter.$or = [
      { summary: { $regex: q, $options: "i" } },
      { actorEmail: { $regex: q, $options: "i" } },
      { actorName: { $regex: q, $options: "i" } },
      { action: { $regex: q, $options: "i" } },
      { entityId: { $regex: q, $options: "i" } },
    ];
  }

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
      actorId: l.actorId ? String(l.actorId) : null,
      actorEmail: l.actorEmail || "",
      actorName: l.actorName || "",
      actorKind: l.actorKind,
      entityType: l.entityType || "",
      entityId: l.entityId || "",
      investorId: l.investorId ? String(l.investorId) : null,
      investorVisible: l.investorVisible,
      changes: l.changes || [],
      metadata: l.metadata || {},
      ip: l.ip || "",
      userAgent: l.userAgent || "",
      requestPath: l.requestPath || "",
      createdAt: l.createdAt,
    })),
  });
}
