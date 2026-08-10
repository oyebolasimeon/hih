import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Profile } from "@/models/Profile";
import { KycSubmission, type IKycCheck } from "@/models/KycSubmission";
import { requirementsForProfile } from "@/lib/kyc-requirements";
import {
  maskId,
  verifyBvnWithFace,
  verifyCacBasic,
  verifyNinWithFace,
} from "@/lib/prembly";
import { actorFromUser, writeAudit } from "@/lib/audit";

const submitSchema = z.object({
  profileId: z.string().min(1),
  nin: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "NIN must be 11 digits"),
  selfieUrl: z.string().url(),
  selfiePublicId: z.string().optional(),
  bvn: z
    .string()
    .trim()
    .regex(/^\d{11}$/, "BVN must be 11 digits")
    .optional(),
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
      requiresManualReview: s.requiresManualReview,
      ninMasked: s.ninMasked,
      bvnMasked: s.bvnMasked,
      selfieUrl: s.selfieUrl,
      checks: s.checks,
      documents: s.documents,
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
  if (reqs.some((r) => r.type === "bvn_face") && !parsed.data.bvn) {
    return NextResponse.json({ error: "BVN is required for landlords." }, { status: 400 });
  }
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
  let verifiedName = "";

  // 1) NIN + face (all)
  try {
    const ninResult = await verifyNinWithFace({
      nin: parsed.data.nin,
      imageUrlOrBase64: parsed.data.selfieUrl,
    });
    checks.push({
      type: "nin_face",
      status: ninResult.ok ? "passed" : "failed",
      provider: "prembly",
      reference: ninResult.reference,
      message: ninResult.message,
      confidence: ninResult.confidence,
      faceMatched: ninResult.faceMatched,
      identity: ninResult.identity,
      raw: ninResult.raw,
      checkedAt: new Date(),
    });
    if (ninResult.identity) {
      verifiedName = [
        ninResult.identity.firstName,
        ninResult.identity.middleName,
        ninResult.identity.surname,
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
    }
  } catch (err) {
    checks.push({
      type: "nin_face",
      status: "failed",
      provider: "prembly",
      message: err instanceof Error ? err.message : "NIN verification error",
      checkedAt: new Date(),
    });
  }

  // 2) BVN + face (landlord)
  if (parsed.data.bvn) {
    try {
      const bvnResult = await verifyBvnWithFace({
        bvn: parsed.data.bvn,
        imageUrlOrBase64: parsed.data.selfieUrl,
      });
      checks.push({
        type: "bvn_face",
        status: bvnResult.ok ? "passed" : "failed",
        provider: "prembly",
        reference: bvnResult.reference,
        message: bvnResult.message,
        confidence: bvnResult.confidence,
        faceMatched: bvnResult.faceMatched,
        identity: bvnResult.identity,
        raw: bvnResult.raw,
        checkedAt: new Date(),
      });
    } catch (err) {
      checks.push({
        type: "bvn_face",
        status: "failed",
        provider: "prembly",
        message: err instanceof Error ? err.message : "BVN verification error",
        checkedAt: new Date(),
      });
    }
  }

  // 3) CAC (estate manager)
  if (parsed.data.cac) {
    try {
      const cacResult = await verifyCacBasic({
        rcNumber: parsed.data.cac.rcNumber,
        companyType: parsed.data.cac.companyType,
        companyName: parsed.data.cac.companyName,
      });
      checks.push({
        type: "cac",
        status: cacResult.ok ? "passed" : "failed",
        provider: "prembly",
        reference: cacResult.reference,
        message: cacResult.message,
        identity: cacResult.identity,
        raw: cacResult.raw,
        checkedAt: new Date(),
      });
      if (cacResult.ok && profile.estateManagerFields) {
        profile.estateManagerFields.cacNumber = parsed.data.cac.rcNumber;
        if (parsed.data.cac.companyName) {
          profile.estateManagerFields.businessName = parsed.data.cac.companyName;
        }
      } else if (cacResult.ok) {
        profile.estateManagerFields = {
          businessName: parsed.data.cac.companyName || "",
          cacNumber: parsed.data.cac.rcNumber,
          businessAddress: "",
          authorizedRepName: verifiedName || user.name || "",
        };
      }
    } catch (err) {
      checks.push({
        type: "cac",
        status: "failed",
        provider: "prembly",
        message: err instanceof Error ? err.message : "CAC verification error",
        checkedAt: new Date(),
      });
    }
  }

  // 4) Student ID — always manual
  const documents = [];
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
      message: "Awaiting Ops / KYC review of student ID",
      checkedAt: new Date(),
    });
    requiresManualReview = true;
  }

  const requiredPrembly = reqs.filter((r) => r.provider === "prembly" && r.required);
  const premblyFailed = requiredPrembly.some((r) => {
    const check = checks.find((c) => c.type === r.type);
    return !check || check.status !== "passed";
  });

  let status: "pending" | "approved" | "failed" = "pending";
  let failureReason: string | undefined;

  if (premblyFailed) {
    status = "failed";
    failureReason = checks
      .filter((c) => c.status === "failed")
      .map((c) => `${c.type}: ${c.message || "failed"}`)
      .join("; ");
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
  if (parsed.data.bvn) profile.bvnMasked = maskId(parsed.data.bvn);
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
    provider: "prembly",
    ninMasked: profile.ninMasked,
    bvnMasked: profile.bvnMasked,
    selfieUrl: parsed.data.selfieUrl,
    selfiePublicId: parsed.data.selfiePublicId,
    documents,
    checks,
    requiresManualReview,
    failureReason,
  });

  profile.latestKycId = submission._id;
  await profile.save();

  await writeAudit({
    action: "kyc.submit",
    summary: `KYC ${status} for ${profile.type} via Prembly`,
    actor: actorFromUser(user),
    entityType: "kyc_submission",
    entityId: String(submission._id),
    metadata: {
      profileId: String(profile._id),
      profileType: profile.type,
      requiresManualReview,
      checks: checks.map((c) => ({ type: c.type, status: c.status })),
    },
  });

  return NextResponse.json(
    {
      submission: {
        id: String(submission._id),
        status: submission.status,
        requiresManualReview: submission.requiresManualReview,
        checks: submission.checks,
        failureReason: submission.failureReason,
        profileStatus: profile.status,
      },
    },
    { status: 201 }
  );
}
