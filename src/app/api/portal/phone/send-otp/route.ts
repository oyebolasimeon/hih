import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/redis";
import {
  otpSet,
  phoneOtpDeliveryChannel,
} from "@/lib/otp-store";
import { sendBrandedMail } from "@/lib/mail";
import { escapeHtml } from "@/lib/email-templates";
import { User } from "@/models/User";

const sendSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(7)
    .max(32)
    .regex(/^[\d\s+().-]+$/, "Enter a valid phone number."),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const allowed = await rateLimit(`phone-otp-send:${user.id}`, 5, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many OTP requests. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid phone." },
      { status: 400 }
    );
  }

  const phone = parsed.data.phone.replace(/\s+/g, " ").trim();
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const ttl = 600;
  const payload = JSON.stringify({ otp, phone, userId: user.id });
  await otpSet(`phone-otp:${user.id}`, payload, ttl);

  const channel = phoneOtpDeliveryChannel();
  await connectDB();
  const dbUser = await User.findById(user.id).select("email name").lean();

  // SMS provider not configured — deliver OTP via account email.
  if (channel === "email") {
    if (!dbUser?.email) {
      return NextResponse.json(
        { error: "Account email required to deliver OTP (SMS not configured)." },
        { status: 400 }
      );
    }
    try {
      await sendBrandedMail({
        to: dbUser.email,
        subject: "Your House In Hand phone verification code",
        htmlBody: `
<p>Your verification code for <strong>${escapeHtml(phone)}</strong> is:</p>
<p style="font-size:28px;letter-spacing:6px;font-weight:700;color:#0B1F3A;margin:16px 0;">${escapeHtml(otp)}</p>
<p>This code expires in 10 minutes.</p>
<p style="color:#5A6A7D;font-size:13px;margin-top:20px;">SMS is not configured on this environment, so we sent the code to your account email instead.</p>
`.trim(),
      });
    } catch (err) {
      console.error("phone otp email failed:", err);
      return NextResponse.json(
        { error: "Could not send OTP email." },
        { status: 502 }
      );
    }
  }

  await writeAudit({
    action: "phone.otp.send",
    summary: `Sent phone OTP via ${channel}`,
    actor: actorFromUser(user),
    entityType: "user",
    entityId: user.id,
    metadata: { channel, phoneMasked: phone.slice(-4) },
    request: req,
  });

  return NextResponse.json({
    ok: true,
    channel,
    expiresIn: ttl,
    message:
      channel === "email"
        ? "OTP sent to your account email (SMS not configured)."
        : "OTP sent by SMS.",
  });
}
