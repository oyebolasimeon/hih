import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { FraudReport } from "@/models/FraudReport";

const createSchema = z.object({
  targetType: z.enum(["listing", "profile", "user"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(3).max(200),
  details: z.string().trim().max(4000).optional(),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid report." },
      { status: 400 }
    );
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.targetId)) {
    return NextResponse.json({ error: "Invalid target." }, { status: 400 });
  }

  await connectDB();
  const report = await FraudReport.create({
    reporterUserId: user.id,
    targetType: parsed.data.targetType,
    targetId: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details || "",
    status: "open",
  });

  await writeAudit({
    action: "fraud.report",
    summary: `Reported ${parsed.data.targetType} for ${parsed.data.reason}`,
    actor: actorFromUser(user),
    entityType: "fraud_report",
    entityId: String(report._id),
    metadata: {
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
    },
    request: req,
  });

  return NextResponse.json(
    {
      report: {
        id: String(report._id),
        status: report.status,
        targetType: report.targetType,
        reason: report.reason,
      },
    },
    { status: 201 }
  );
}
