import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { KycSubmission, type IKycCheck } from "@/models/KycSubmission";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";
import { actorFromUser, writeAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const { response } = await assertAdmin("kyc:read");
  if (response) return response;

  await connectDB();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "";
  const filter: Record<string, unknown> = {};
  if (status && status !== "all") filter.status = status;
  if (url.searchParams.get("manual") === "1") {
    filter.requiresManualReview = true;
    filter.status = "pending";
  }

  const rows = await KycSubmission.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const userIds = [...new Set(rows.map((r) => String(r.userId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select("name email")
    .lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return NextResponse.json({
    submissions: rows.map((s) => {
      const u = userMap.get(String(s.userId));
      return {
        id: String(s._id),
        profileId: String(s.profileId),
        profileType: s.profileType,
        status: s.status,
        requiresManualReview: s.requiresManualReview,
        ninMasked: s.ninMasked,
        bvnMasked: s.bvnMasked,
        selfieUrl: s.selfieUrl,
        documents: s.documents,
        checks: s.checks,
        failureReason: s.failureReason,
        reviewerNotes: s.reviewerNotes,
        userName: u?.name || "",
        userEmail: u?.email || "",
        createdAt: s.createdAt,
        reviewedAt: s.reviewedAt,
      };
    }),
  });
}

const reviewSchema = z.object({
  submissionId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
  notes: z.string().trim().max(2000).optional(),
});

export async function PATCH(req: Request) {
  const { user, response } = await assertAdmin("kyc:write");
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }

  await connectDB();
  const submission = await KycSubmission.findById(parsed.data.submissionId);
  if (!submission) {
    return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  }
  if (submission.status !== "pending") {
    return NextResponse.json(
      { error: "Only pending submissions can be reviewed." },
      { status: 409 }
    );
  }

  const profile = await Profile.findById(submission.profileId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const approved = parsed.data.decision === "approve";
  submission.status = approved ? "approved" : "rejected";
  submission.reviewerNotes = parsed.data.notes || "";
  submission.reviewedAt = new Date();
  submission.requiresManualReview = false;

  submission.checks = submission.checks.map((c: IKycCheck) => {
    const plain = {
      type: c.type,
      status: c.status,
      provider: c.provider,
      reference: c.reference,
      message: c.message,
      confidence: c.confidence,
      faceMatched: c.faceMatched,
      identity: c.identity,
      raw: c.raw,
      checkedAt: c.checkedAt,
    };
    if (c.type === "student_id" || c.provider === "manual") {
      return {
        ...plain,
        status: approved ? ("passed" as const) : ("failed" as const),
        message: approved
          ? "Approved by Ops / KYC reviewer"
          : parsed.data.notes || "Rejected by Ops / KYC reviewer",
        checkedAt: new Date(),
      };
    }
    return plain;
  });

  if (approved) {
    profile.status = "verified";
    profile.verifiedAt = new Date();
  } else {
    profile.status = "rejected";
  }

  await submission.save();
  await profile.save();

  await writeAudit({
    action: approved ? "kyc.approve" : "kyc.reject",
    summary: `${approved ? "Approved" : "Rejected"} KYC for ${submission.profileType}`,
    actor: actorFromUser({ ...user, isAdmin: true }),
    entityType: "kyc_submission",
    entityId: String(submission._id),
    metadata: { notes: parsed.data.notes || "" },
  });

  return NextResponse.json({
    submission: {
      id: String(submission._id),
      status: submission.status,
      profileStatus: profile.status,
    },
  });
}
