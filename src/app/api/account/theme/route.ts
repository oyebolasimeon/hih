import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { assertInvestor } from "@/lib/api-auth";

const schema = z.object({
  theme: z.enum(["light", "dark"]),
});

export async function PATCH(request: Request) {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid theme." }, { status: 400 });
    }

    await connectDB();
    await User.findByIdAndUpdate(user.id, { theme: parsed.data.theme });
    return NextResponse.json({ success: true, theme: parsed.data.theme });
  } catch (err) {
    console.error("Theme update error:", err);
    return NextResponse.json({ error: "Unable to update theme." }, { status: 500 });
  }
}
