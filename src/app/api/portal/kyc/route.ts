import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Profile } from "@/models/Profile";
import { KycSubmission, type IKycCheck } from "@/models/KycSubmission";
import { requirementsForProfile } from "@/lib/kyc-requirements";
import { verifyIdentityWithAi } from "@/lib/kyc-ai-verify";
import { maskId } from "@/lib/kyc-id";
import { actorFromUser, writeAudit } from "@/lib/audit";

const submitSchema = z.object({
  profileId: z.string().min(1),
  declaredName: z.string().trim().min(2).max(120),
  nin: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "NIN must be 11 digits"),
  selfieUrl: z.string().url(),
  selfiePublicId: z.string().optional(),
  idDocumentUrl: z.string().url(),
  idDocumentPublicId: z.string().optional(),
  idDocumentFilename: z.string().optional(),
  cac: z
    .object({
      rcNumber: z.string().trim().min(2).max(32),
      companyType: z.enum(["RC", "BN", "IT"]).default("RC"),
      companyName: z.string().trim().min(2).max(200).optional(),
    })
    .optional(),
  student: z
    .object({
      institution: z.string().trim().min(2).max(200),
      studentIdNumber: z.string().trim().min(2).max(64),
      studentIdUrl: z.string().url(),
      studentIdFilename: z.string().optional(),
      studentIdPublicId: z.string().optional(),
    })
    .optional(),
});

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const submissions = await KycSubmission.find({ userId: user.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return NextResponse.json({
    submissions: submissions.map((s) => ({
      id: String(s._id),
      profileId: String(s.profileId),
      profileType: s.profileType,
      status: s.status,
      provider: s.provider,
      requiresManualReview: s.requiresManualReview,
      declaredName: s.declaredName,
      ninMasked: s.ninMasked,
      bvnMasked: s.bvnMasked,
      selfieUrl: s.selfieUrl,
      idDocumentUrl: s.idDocumentUrl,
      checks: s.checks,
      documents: s.documents,
      aiRecommendation: s.aiRecommendation,
      aiConfidence: s.aiConfidence,
      failureReason: s.failureReason,
      reviewerNotes: s.reviewerNotes,
      createdAt: s.createdAt,
      reviewedAt: s.reviewedAt,
    })),
  });
}

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || "Invalid KYC payload.",
        issues: parsed.error.issues,
      },
      { status: 400 }
    );
  }

  await connectDB();
  const profile = await Profile.findOne({
    _id: parsed.data.profileId,
    userId: user.id,
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  if (profile.status === "verified") {
    return NextResponse.json(
      { error: "This profile is already verified." },
      { status: 409 }
    );
  }

  const pending = await KycSubmission.findOne({
    profileId: profile._id,
    status: "pending",
  });
  if (pending) {
    return NextResponse.json(
      {
        error: "A KYC submission is already pending for this profile.",
        submissionId: String(pending._id),
      },
      { status: 409 }
    );
  }

  const reqs = requirementsForProfile(profile.type);
  if (reqs.some((r) => r.type === "cac") && !parsed.data.cac) {
    return NextResponse.json(
      { error: "CAC / RC details are required for estate managers." },
      { status: 400 }
    );
  }
  if (reqs.some((r) => r.type === "student_id") && !parsed.data.student) {
    return NextResponse.json(
      { error: "Student institution and ID document are required." },
      { status: 400 }
    );
  }

  const checks: IKycCheck[] = [];
  let requiresManualReview = false;
  let verifiedName = parsed.data.declaredName.trim();
  let aiRecommendation: "approve" | "manual_review" | "reject" | null = null;
  let aiConfidence: number | null = null;

  // 1) In-house AI: selfie + ID image + declared name (+ NIN recorded masked)
  const aiResult = await verifyIdentityWithAi({
    declaredName: parsed.data.declaredName,
    nin: parsed.data.nin,
    selfieUrl: parsed.data.selfieUrl,
    idImageUrl: parsed.data.idDocumentUrl,
  });

  aiRecommendation = aiResult.recommendation;
  aiConfidence = aiResult.confidence;

  if (aiResult.recommendation === "approve") {
    checks.push({
      type: "nin_face",
      status: "passed",
      provider: "hih",
      reference: aiResult.reference,
      message: aiResult.message,
      confidence: aiResult.confidence,
      faceMatched: aiResult.faceMatched,
      nameMatched: aiResult.nameMatched,
      identity: aiResult.identity,
      raw: aiResult.raw,
      checkedAt: new Date(),
    });
    const idName = String(aiResult.identity.idNameOnDocument || "").trim();
    if (idName) verifiedName = idName;
  } else if (aiResult.recommendation === "reject") {
    checks.push({
      type: "nin_face",
      status: "failed",
      provider: "hih",
      reference: aiResult.reference,
      message: aiResult.message,
      confidence: aiResult.confidence,
      faceMatched: aiResult.faceMatched,
      nameMatched: aiResult.nameMatched,
      identity: aiResult.identity,
      raw: aiResult.raw,
      checkedAt: new Date(),
    });
  } else {
    // Not confident enough → admin must decide
    checks.push({
      type: "nin_face",
      status: "pending",
      provider: "hih",
      reference: aiResult.reference,
      message: aiResult.message,
      confidence: aiResult.confidence,
      faceMatched: aiResult.faceMatched,
      nameMatched: aiResult.nameMatched,
      identity: aiResult.identity,
      raw: aiResult.raw,
      checkedAt: new Date(),
    });
    requiresManualReview = true;
  }

  const documents: Array<{
    kind: string;
    url: string;
    filename?: string;
    publicId?: string;
  }> = [
    {
      kind: "government_id",
      url: parsed.data.idDocumentUrl,
      filename: parsed.data.idDocumentFilename,
      publicId: parsed.data.idDocumentPublicId,
    },
  ];

  // 2) CAC — collected for admin review (no Prembly/YouVerify call)
  if (parsed.data.cac) {
    checks.push({
      type: "cac",
      status: "pending",
      provider: "manual",
      message: "CAC / RC details awaiting admin review",
      identity: {
        rcNumber: parsed.data.cac.rcNumber,
        companyType: parsed.data.cac.companyType,
        companyName: parsed.data.cac.companyName || "",
      },
      checkedAt: new Date(),
    });
    requiresManualReview = true;
    if (profile.estateManagerFields) {
      profile.estateManagerFields.cacNumber = parsed.data.cac.rcNumber;
      if (parsed.data.cac.companyName) {
        profile.estateManagerFields.businessName = parsed.data.cac.companyName;
      }
    } else {
      profile.estateManagerFields = {
        businessName: parsed.data.cac.companyName || "",
        cacNumber: parsed.data.cac.rcNumber,
        businessAddress: "",
        authorizedRepName: verifiedName || user.name || "",
      };
    }
  }

  // 3) Student ID — always admin
  if (parsed.data.student) {
    documents.push({
      kind: "student_id",
      url: parsed.data.student.studentIdUrl,
      filename: parsed.data.student.studentIdFilename,
      publicId: parsed.data.student.studentIdPublicId,
    });
    profile.studentFields = {
      institution: parsed.data.student.institution,
      studentIdNumber: parsed.data.student.studentIdNumber,
    };
    checks.push({
      type: "student_id",
      status: "pending",
      provider: "manual",
      message: "Awaiting admin review of student ID",
      checkedAt: new Date(),
    });
    requiresManualReview = true;
  }

  let status: "pending" | "approved" | "failed" = "pending";
  let failureReason: string | undefined;

  if (aiResult.recommendation === "reject") {
    status = "failed";
    failureReason = aiResult.message;
    profile.status = "rejected";
  } else if (requiresManualReview) {
    status = "pending";
    profile.status = "pending_kyc";
  } else {
    status = "approved";
    profile.status = "verified";
    profile.verifiedAt = new Date();
  }

  profile.ninMasked = maskId(parsed.data.nin);
  if (verifiedName) {
    profile.kycVerifiedName = verifiedName;
    if (!profile.displayName || profile.displayName === user.name) {
      profile.displayName = verifiedName;
    }
  }

  const submission = await KycSubmission.create({
    profileId: profile._id,
    userId: user.id,
    profileType: profile.type,
    status,
    provider: "hih",
    declaredName: parsed.data.declaredName.trim(),
    ninMasked: profile.ninMasked,
    bvnMasked: profile.bvnMasked,
    selfieUrl: parsed.data.selfieUrl,
    selfiePublicId: parsed.data.selfiePublicId,
    idDocumentUrl: parsed.data.idDocumentUrl,
    idDocumentPublicId: parsed.data.idDocumentPublicId,
    documents,
    checks,
    requiresManualReview,
    aiRecommendation,
    aiConfidence,
    failureReason,
  });

  profile.latestKycId = submission._id;
  await profile.save();

  await writeAudit({
    action: "kyc.submit",
    summary: `KYC ${status} for ${profile.type} via HIH AI${
      requiresManualReview ? " (manual review)" : ""
    }`,
    actor: actorFromUser(user),
    entityType: "kyc_submission",
    entityId: String(submission._id),
    metadata: {
      profileId: String(profile._id),
      profileType: profile.type,
      requiresManualReview,
      aiRecommendation,
      aiConfidence,
      checks: checks.map((c) => ({ type: c.type, status: c.status })),
    },
  });

  return NextResponse.json(
    {
      submission: {
        id: String(submission._id),
        status: submission.status,
        requiresManualReview: submission.requiresManualReview,
        aiRecommendation: submission.aiRecommendation,
        aiConfidence: submission.aiConfidence,
        checks: submission.checks,
        failureReason: submission.failureReason,
        profileStatus: profile.status,
      },
    },
    { status: 201 }
  );
}
