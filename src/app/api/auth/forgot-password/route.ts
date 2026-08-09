import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { sendPasswordResetEmail } from "@/lib/mail";
import { rateLimit, redisSet } from "@/lib/redis";

const schema = z.object({
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    const allowed = await rateLimit(`forgot:${ip}`, 5, 3600).catch(() => true);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    await connectDB();
    const user = await User.findOne({ email });

    // Always return success to avoid email enumeration
    if (user) {
      const token = randomBytes(32).toString("hex");
      await redisSet(`pwdreset:${token}`, String(user._id), 3600);
      try {
        await sendPasswordResetEmail(email, token);
      } catch (err) {
        console.error("Reset email failed:", err);
      }
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json(
      { error: "Unable to process request. Please try again." },
      { status: 500 }
    );
  }
}
