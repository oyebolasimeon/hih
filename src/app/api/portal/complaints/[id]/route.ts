import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import {
  requireActiveProfile,
  notifyUser,
} from "@/lib/profile-context";
import { Complaint } from "@/models/Complaint";
import { User } from "@/models/User";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z
    .enum(["open", "acknowledged", "in_progress", "resolved", "dismissed"])
    .optional(),
  landlordNotes: z.string().trim().max(2000).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, [
    "landlord",
    "estate_manager",
  ]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid complaint." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid update." },
      { status: 400 }
    );
  }

  await connectDB();
  const complaint = await Complaint.findOne({
    _id: id,
    landlordUserId: user.id,
  });
  if (!complaint) {
    return NextResponse.json({ error: "Complaint not found." }, { status: 404 });
  }

  if (parsed.data.status !== undefined) {
    complaint.status = parsed.data.status;
    if (
      parsed.data.status === "resolved" ||
      parsed.data.status === "dismissed"
    ) {
      complaint.resolvedAt = new Date();
    }
  }
  if (parsed.data.landlordNotes !== undefined) {
    complaint.landlordNotes = parsed.data.landlordNotes;
  }
  await complaint.save();

  const reporter = await User.findById(complaint.reporterUserId)
    .select("email")
    .lean();
  if (reporter) {
    await notifyUser({
      userId: String(complaint.reporterUserId),
      type: "complaint.updated",
      title: "Complaint update",
      body: `Your complaint “${complaint.title}” is now ${complaint.status}.`,
      link: "/portal/complaints",
      email: reporter.email
        ? { to: reporter.email, subject: "Complaint update" }
        : undefined,
    }).catch(() => undefined);
  }

  return NextResponse.json({
    complaint: {
      id: String(complaint._id),
      status: complaint.status,
      landlordNotes: complaint.landlordNotes || "",
      resolvedAt: complaint.resolvedAt || null,
    },
  });
}
