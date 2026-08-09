import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { redisDel, redisGet } from "@/lib/redis";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid reset request. Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const userId = await redisGet(`pwdreset:${parsed.data.token}`);
    if (!userId) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    await connectDB();
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    user.passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await user.save();
    await redisDel(`pwdreset:${parsed.data.token}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json(
      { error: "Unable to reset password. Please try again." },
      { status: 500 }
    );
  }
}
