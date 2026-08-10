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
import { sendMail } from "@/lib/mail";
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
      await sendMail({
        to: dbUser.email,
        subject: "Your House In Hand phone verification code",
        text: `Your verification code for ${phone} is ${otp}. It expires in 10 minutes.`,
        html: `<p>Your verification code for <strong>${phone}</strong> is:</p><p style="font-size:24px;letter-spacing:4px"><strong>${otp}</strong></p><p>Expires in 10 minutes.</p><p style="color:#666;font-size:12px">SMS is not configured; OTP was sent by email.</p>`,
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
