import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { assertInvestor } from "@/lib/api-auth";
import { actorFromUser, diffObjects, writeAudit } from "@/lib/audit";

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
    const before = await User.findById(user.id).lean();
    if (!before) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const doc = await User.findByIdAndUpdate(
      user.id,
      { theme: parsed.data.theme },
      { new: true }
    ).lean();

    await writeAudit({
      action: "user.theme_update",
      summary: `Updated theme to ${parsed.data.theme}`,
      actor: actorFromUser(user),
      entityType: "User",
      entityId: user.id,
      investorId: user.id,
      investorVisible: true,
      changes: diffObjects(
        { theme: before.theme },
        { theme: doc?.theme ?? parsed.data.theme },
        ["theme"]
      ),
      request,
    });

    return NextResponse.json({ success: true, theme: parsed.data.theme });
  } catch (err) {
    console.error("Theme update error:", err);
    return NextResponse.json({ error: "Unable to update theme." }, { status: 500 });
  }
}
