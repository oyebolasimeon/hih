import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Investor } from "@/models/Investor";
import { sendVerificationEmail } from "@/lib/mail";
import { rateLimit, redisSet } from "@/lib/redis";
import { sanitizeAuditValue, writeAudit } from "@/lib/audit";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            "Please provide a valid name, email, and password (min 8 characters).",
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const allowed = await rateLimit(`register:${ip}`, 10, 3600).catch(
      () => true
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429 }
      );
    }

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
      if (existing.emailVerified === false) {
        const token = randomBytes(32).toString("hex");
        await redisSet(`emailverify:${token}`, String(existing._id), 86400);
        try {
          await sendVerificationEmail(email, token, existing.name);
        } catch (err) {
          console.error("Resend verification email failed:", err);
        }
        return NextResponse.json({
          success: true,
          needsVerification: true,
          message:
            "Account pending verification. We sent a new verification link to your email.",
        });
      }
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const user = await User.create({
      name: parsed.data.name,
      email,
      passwordHash,
      theme: "dark",
      phone: "",
      emailNotifications: true,
      emailVerified: false,
    });

    await Investor.create({
      _id: user._id,
      name: parsed.data.name,
      email,
      totalInvested: 0,
      totalReturns: 0,
      portfolioValue: 0,
    });

    const userId = String(user._id);
    const token = randomBytes(32).toString("hex");
    await redisSet(`emailverify:${token}`, userId, 86400);

    let emailSent = true;
    try {
      await sendVerificationEmail(email, token, parsed.data.name);
    } catch (err) {
      emailSent = false;
      console.error("Verification email failed:", err);
    }

    await writeAudit({
      action: "auth.register",
      summary: `Registered account ${email} (pending verification)`,
      actor: {
        id: userId,
        email: user.email,
        name: user.name,
        kind: "investor",
      },
      entityType: "User",
      entityId: userId,
      investorId: userId,
      investorVisible: true,
      changes: [
        {
          field: "account",
          oldValue: null,
          newValue: sanitizeAuditValue({
            name: user.name,
            email: user.email,
            emailVerified: false,
            phone: user.phone || "",
            emailNotifications: user.emailNotifications !== false,
          }),
        },
      ],
      request,
    });

    return NextResponse.json({
      success: true,
      needsVerification: true,
      emailSent,
      message: emailSent
        ? "Check your email for a verification link to finish signing up."
        : "Account created, but we could not send the verification email. Use Resend on the next screen or contact support.",
      user: { id: userId, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json(
      { error: "Unable to create account. Please try again." },
      { status: 500 }
    );
  }
}
