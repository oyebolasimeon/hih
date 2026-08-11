import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { sendVerificationEmail, sendWelcomeEmail } from "@/lib/mail";
import { rateLimit } from "@/lib/redis";
import { tokenDel, tokenGet, tokenSet } from "@/lib/token-store";
import { writeAudit } from "@/lib/audit";

const verifySchema = z.object({
  token: z.string().min(10),
});

/** Confirm email via token; returns a one-time auto-login token for the client. */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid verification link." },
        { status: 400 }
      );
    }

    const userId = await tokenGet(`emailverify:${parsed.data.token}`);
    if (!userId) {
      return NextResponse.json(
        { error: "This verification link is invalid or has expired." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      await tokenDel(`emailverify:${parsed.data.token}`);
      return NextResponse.json(
        { error: "This verification link is invalid or has expired." },
        { status: 400 }
      );
    }

    const alreadyVerified = user.emailVerified !== false;
    if (!alreadyVerified) {
      user.emailVerified = true;
      await user.save();
      try {
        await sendWelcomeEmail(user.email, user.name);
      } catch (err) {
        console.error("Welcome email after verify failed:", err);
      }

      await writeAudit({
        action: "auth.email_verified",
        summary: `Verified email for ${user.email}`,
        actor: {
          id: String(user._id),
          email: user.email,
          name: user.name,
          kind: "investor",
        },
        entityType: "User",
        entityId: String(user._id),
        investorId: String(user._id),
        investorVisible: true,
        request,
      });
    }

    await tokenDel(`emailverify:${parsed.data.token}`);

    const autoLoginToken = randomBytes(32).toString("hex");
    await tokenSet(`autologin:${autoLoginToken}`, String(user._id), 120);

    return NextResponse.json({
      success: true,
      email: user.email,
      autoLoginToken,
      alreadyVerified,
      message: alreadyVerified
        ? "Email already verified. Signing you in…"
        : "Email verified. Signing you in…",
    });
  } catch (err) {
    console.error("Verify email error:", err);
    return NextResponse.json(
      { error: "Unable to verify email. Please try again." },
      { status: 500 }
    );
  }
}

const resendSchema = z.object({
  email: z.string().trim().email(),
});

/** Resend verification email for an unverified account. */
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = resendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const allowed = await rateLimit(`verify-resend:${ip}`, 5, 3600).catch(
      () => true
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email });

    // Always succeed outwardly to avoid enumeration, but only email if needed
    if (user && user.emailVerified === false) {
      const token = randomBytes(32).toString("hex");
      await tokenSet(`emailverify:${token}`, String(user._id), 86400);
      try {
        await sendVerificationEmail(email, token, user.name);
      } catch (err) {
        console.error("Resend verification failed:", err);
        return NextResponse.json(
          {
            error:
              "Unable to send verification email right now. Please try again shortly.",
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message:
        "If that account needs verification, a new link has been sent.",
    });
  } catch (err) {
    console.error("Resend verify error:", err);
    return NextResponse.json(
      { error: "Unable to resend verification email." },
      { status: 500 }
    );
  }
}
