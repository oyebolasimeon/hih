import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { requireActiveProfile } from "@/lib/profile-context";
import {
  CreditScore,
  type CreditBand,
  type ICreditFactor,
} from "@/models/CreditScore";
import { Payment } from "@/models/Payment";
import { Lease } from "@/models/Lease";
import { FraudReport } from "@/models/FraudReport";
import { Profile } from "@/models/Profile";

function bandFor(score: number): CreditBand {
  if (score >= 800) return "excellent";
  if (score >= 740) return "very_good";
  if (score >= 670) return "good";
  if (score >= 580) return "fair";
  return "poor";
}

function serializeScore(s: Record<string, unknown>) {
  return {
    id: String(s._id),
    userId: String(s.userId),
    profileId: String(s.profileId),
    score: s.score,
    band: s.band,
    factors: s.factors || [],
    computedAt: s.computedAt,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, ["tenant", "student"]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  await connectDB();
  const existing = await CreditScore.findOne({
    userId: user.id,
    profileId: active.profile._id,
  }).lean();

  return NextResponse.json({
    creditScore: existing
      ? serializeScore(existing as unknown as Record<string, unknown>)
      : null,
  });
}

export async function POST() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, ["tenant", "student"]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  await connectDB();
  const factors: ICreditFactor[] = [];
  let score = 550;

  const profile = await Profile.findById(active.profile._id).lean();
  if (profile?.status === "verified") {
    score += 80;
    factors.push({
      key: "kyc_verified",
      label: "KYC verified",
      impact: 80,
      detail: "Identity verification completed",
    });
  } else {
    factors.push({
      key: "kyc_missing",
      label: "KYC incomplete",
      impact: 0,
      detail: "Verify your profile to improve your score",
    });
  }

  const successfulPayments = await Payment.countDocuments({
    payerUserId: user.id,
    status: "successful",
  });
  const payBoost = Math.min(100, successfulPayments * 15);
  score += payBoost;
  factors.push({
    key: "payments",
    label: "Successful payments",
    impact: payBoost,
    detail: `${successfulPayments} successful payment(s)`,
  });

  const activeLease = await Lease.countDocuments({
    tenantProfileId: active.profile._id,
    status: "active",
  });
  if (activeLease > 0) {
    score += 40;
    factors.push({
      key: "lease_active",
      label: "Active lease",
      impact: 40,
      detail: "Current tenancy on platform",
    });
  }

  const fraudAgainst = await FraudReport.countDocuments({
    targetType: { $in: ["user", "profile"] },
    targetId: {
      $in: [new mongoose.Types.ObjectId(user.id), active.profile._id],
    },
    status: { $in: ["open", "reviewing", "resolved"] },
  });
  if (fraudAgainst > 0) {
    const penalty = Math.min(120, fraudAgainst * 40);
    score -= penalty;
    factors.push({
      key: "fraud_reports",
      label: "Fraud reports",
      impact: -penalty,
      detail: `${fraudAgainst} report(s) linked to your account`,
    });
  }

  score = Math.max(300, Math.min(850, Math.round(score)));
  const band = bandFor(score);
  const computedAt = new Date();

  const doc = await CreditScore.findOneAndUpdate(
    { userId: user.id, profileId: active.profile._id },
    {
      $set: {
        score,
        band,
        factors,
        computedAt,
      },
      $setOnInsert: {
        userId: user.id,
        profileId: active.profile._id,
      },
    },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json({
    creditScore: serializeScore(doc as unknown as Record<string, unknown>),
  });
}
