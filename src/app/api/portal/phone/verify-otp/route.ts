import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/redis";
import { otpDel, otpGet } from "@/lib/otp-store";
import { User } from "@/models/User";

const verifySchema = z.object({
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const allowed = await rateLimit(`phone-otp-verify:${user.id}`, 20, 3600);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid OTP." },
      { status: 400 }
    );
  }

  const raw = await otpGet(`phone-otp:${user.id}`);
  if (!raw) {
    return NextResponse.json(
      { error: "OTP expired or not found. Request a new code." },
      { status: 400 }
    );
  }

  let stored: { otp: string; phone: string; userId: string };
  try {
    stored = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid OTP state." }, { status: 400 });
  }

  if (stored.userId !== user.id || stored.otp !== parsed.data.otp) {
    return NextResponse.json({ error: "Incorrect OTP." }, { status: 400 });
  }

  await connectDB();
  const dbUser = await User.findById(user.id);
  if (!dbUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  dbUser.phone = stored.phone;
  dbUser.phoneVerified = true;
  await dbUser.save();
  await otpDel(`phone-otp:${user.id}`);

  await writeAudit({
    action: "phone.verify",
    summary: "Phone number verified",
    actor: actorFromUser(user),
    entityType: "user",
    entityId: user.id,
    metadata: { phoneMasked: stored.phone.slice(-4) },
    request: req,
  });

  return NextResponse.json({
    ok: true,
    phone: dbUser.phone,
    phoneVerified: true,
  });
}
