import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { Property } from "@/models/Property";
import { User } from "@/models/User";
import { sendPasswordResetEmail, sendWelcomeEmail } from "@/lib/mail";
import { redisSet } from "@/lib/redis";
import {
  actorFromUser,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

export async function GET(request: Request) {
  const { user, response } = await assertAdmin("investors:read");
  if (response || !user) return response!;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const investors = await Investor.find(filter).sort({ createdAt: -1 }).lean();
  const counts = await Property.aggregate([
    {
      $match: {
        investorId: { $ne: null },
        ownerType: { $ne: "company" },
      },
    },
    { $group: { _id: "$investorId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count as number]));

  return NextResponse.json({
    investors: investors.map((inv) => ({
      id: String(inv._id),
      name: inv.name,
      email: inv.email,
      totalInvested: inv.totalInvested,
      totalReturns: inv.totalReturns,
      portfolioValue: inv.portfolioValue,
      propertyCount: countMap.get(String(inv._id)) || 0,
      createdAt: inv.createdAt,
    })),
  });
}

const inviteSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional().default(""),
});

/** Create investor account (if needed) and send password-setup / invite email. */
export async function POST(request: Request) {
  const { user, response } = await assertAdmin("investors:write");
  if (response || !user) return response!;

  const body = await request.json();
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Provide a valid name and email." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name;
  const phone = parsed.data.phone || "";

  let account = await User.findOne({ email });
  let createdAuthUser = false;

  if (!account) {
    const tempPassword = randomBytes(24).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 12);
    account = await User.create({
      name,
      email,
      passwordHash,
      phone,
      theme: "dark",
      emailNotifications: true,
    });
    createdAuthUser = true;
  } else if (phone && !account.phone) {
    account.phone = phone;
    if (name) account.name = name;
    await account.save();
  }

  let investor = await Investor.findById(account._id);
  if (!investor) {
    investor = await Investor.create({
      _id: account._id,
      name,
      email,
      totalInvested: 0,
      totalReturns: 0,
      portfolioValue: 0,
    });
  } else if (createdAuthUser || investor.name !== name) {
    investor.name = name;
    await investor.save();
  }

  const token = randomBytes(32).toString("hex");
  await redisSet(`pwdreset:${token}`, String(account._id), 86400);

  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const inviteLink = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

  try {
    await sendPasswordResetEmail(email, token, name);
  } catch (err) {
    console.error("Invite reset email failed:", err);
  }

  if (createdAuthUser) {
    try {
      await sendWelcomeEmail(email, name);
    } catch (err) {
      console.error("Welcome email failed:", err);
    }
  }

  await writeAudit({
    action: "investor.invite",
    summary: createdAuthUser
      ? `Invited new investor ${email}`
      : `Re-sent invite / setup link for ${email}`,
    actor: actorFromUser(user),
    entityType: "Investor",
    entityId: String(investor._id),
    investorId: String(investor._id),
    investorVisible: true,
    changes: [
      {
        field: "invite",
        oldValue: null,
        newValue: sanitizeAuditValue({
          name,
          email,
          phone,
          createdAuthUser,
        }),
      },
    ],
    request,
  });

  return NextResponse.json({
    uid: String(investor._id),
    id: String(investor._id),
    email,
    name,
    createdAuthUser,
    inviteLink,
    message: createdAuthUser
      ? "Investor account created. Setup link emailed."
      : "Account already existed. Fresh setup link emailed.",
  });
}
