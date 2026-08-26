import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";
import { actorFromUser, writeAudit } from "@/lib/audit";

const switchSchema = z.object({
  profileId: z.string().min(1),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = switchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "profileId required." }, { status: 400 });
  }

  await connectDB();
  const profile = await Profile.findOne({
    _id: parsed.data.profileId,
    userId: user.id,
  });
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  if (profile.status === "suspended") {
    return NextResponse.json(
      { error: "This profile is suspended and cannot be selected." },
      { status: 403 }
    );
  }

  await User.findByIdAndUpdate(user.id, { activeProfileId: profile._id });

  await writeAudit({
    action: "profile.switch",
    actor: actorFromUser(user),
    entityType: "profile",
    entityId: String(profile._id),
    summary: `Switched to ${profile.type} profile`,
  });

  return NextResponse.json({
    activeProfileId: String(profile._id),
    type: profile.type,
    status: profile.status,
  });
}
