import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Profile } from "@/models/Profile";
import { KycSubmission } from "@/models/KycSubmission";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/profile-context";

export async function GET(req: Request) {
  const { response } = await assertAdmin("users:read");
  if (response) return response;

  await connectDB();
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { email: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
      { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
    ];
  }

  const users = await User.find(filter)
    .select("name email emailVerified phoneVerified createdAt activeProfileId")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const userIds = users.map((u) => u._id);
  const profiles = await Profile.find({ userId: { $in: userIds } }).lean();
  const profilesByUser = new Map<string, typeof profiles>();
  for (const p of profiles) {
    const key = String(p.userId);
    const list = profilesByUser.get(key) || [];
    list.push(p);
    profilesByUser.set(key, list);
  }

  return NextResponse.json({
    users: users.map((u) => ({
      id: String(u._id),
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified !== false,
      phoneVerified: !!u.phoneVerified,
      activeProfileId: u.activeProfileId ? String(u.activeProfileId) : null,
      createdAt: u.createdAt,
      profiles: (profilesByUser.get(String(u._id)) || []).map((p) => ({
        id: String(p._id),
        type: p.type,
        status: p.status,
        displayName: p.displayName,
        verifiedAt: p.verifiedAt,
      })),
    })),
  });
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("verify_email"),
    userId: z.string().min(1),
  }),
  z.object({
    action: z.literal("unverify_email"),
    userId: z.string().min(1),
  }),
  z.object({
    action: z.literal("verify_profile"),
    profileId: z.string().min(1),
    notes: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal("suspend_profile"),
    profileId: z.string().min(1),
    notes: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal("reject_profile"),
    profileId: z.string().min(1),
    notes: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal("reset_profile"),
    profileId: z.string().min(1),
    notes: z.string().trim().max(2000).optional(),
  }),
]);

export async function PATCH(req: Request) {
  const { user, response } = await assertAdmin("users:write");
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await connectDB();

  if (
    parsed.data.action === "verify_email" ||
    parsed.data.action === "unverify_email"
  ) {
    const target = await User.findById(parsed.data.userId);
    if (!target) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const verify = parsed.data.action === "verify_email";
    target.emailVerified = verify;
    await target.save();

    await writeAudit({
      action: verify ? "admin.user.verify_email" : "admin.user.unverify_email",
      summary: `${verify ? "Verified" : "Unverified"} email for ${target.email}`,
      actor: actorFromUser({ ...user, isAdmin: true }),
      entityType: "User",
      entityId: String(target._id),
      metadata: { email: target.email },
    });

    if (verify) {
      await notifyUser({
        userId: String(target._id),
        type: "account.email_verified",
        title: "Email verified",
        body: "Your House In Hand email has been verified by our team. You can sign in now.",
        link: "/portal",
        email: { to: target.email, subject: "Your email is verified — House In Hand" },
      }).catch(() => undefined);
    }

    return NextResponse.json({
      user: {
        id: String(target._id),
        emailVerified: target.emailVerified !== false,
      },
    });
  }

  const profile = await Profile.findById(parsed.data.profileId);
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  const notes = parsed.data.notes || "";
  const owner = await User.findById(profile.userId).select("email name").lean();

  if (parsed.data.action === "verify_profile") {
    profile.status = "verified";
    profile.verifiedAt = new Date();

    const submission = await KycSubmission.create({
      userId: profile.userId,
      profileId: profile._id,
      profileType: profile.type,
      status: "approved",
      provider: "prembly",
      documents: [],
      requiresManualReview: false,
      reviewerNotes: notes || "Manually verified by admin (no documents required)",
      reviewedAt: new Date(),
      checks: [
        {
          type: "manual",
          status: "passed",
          provider: "manual",
          message: notes || "Approved by admin without uploaded documents",
          checkedAt: new Date(),
        },
      ],
    });

    profile.latestKycId = submission._id;
    await profile.save();

    await notifyUser({
      userId: String(profile.userId),
      type: "kyc.approved",
      title: "Profile verified",
      body: `Your ${profile.type.replace("_", " ")} profile has been verified. You can use all features now.`,
      link: "/portal",
      email: owner?.email
        ? {
            to: owner.email,
            subject: "Your profile is verified — House In Hand",
          }
        : undefined,
    }).catch(() => undefined);
  } else if (parsed.data.action === "suspend_profile") {
    profile.status = "suspended";
    await profile.save();
  } else if (parsed.data.action === "reject_profile") {
    profile.status = "rejected";
    await profile.save();
  } else if (parsed.data.action === "reset_profile") {
    profile.status = "draft";
    profile.verifiedAt = undefined;
    await profile.save();
  }

  await writeAudit({
    action: `admin.profile.${parsed.data.action}`,
    summary: `${parsed.data.action.replace("_", " ")} for ${profile.type} profile (${profile.displayName})`,
    actor: actorFromUser({ ...user, isAdmin: true }),
    entityType: "profile",
    entityId: String(profile._id),
    metadata: { notes, userId: String(profile.userId) },
  });

  return NextResponse.json({
    profile: {
      id: String(profile._id),
      status: profile.status,
      verifiedAt: profile.verifiedAt,
    },
  });
}
