import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const dbUser = await User.findById(user.id)
    .select("name email phone phoneVerified activeProfileId")
    .lean();
  const profiles = await Profile.find({ userId: user.id })
    .select("type status displayName verifiedAt")
    .lean();

  return NextResponse.json({
    user: {
      id: user.id,
      name: dbUser?.name || user.name,
      email: dbUser?.email || user.email,
      phone: dbUser?.phone || "",
      phoneVerified: !!dbUser?.phoneVerified,
      activeProfileId: dbUser?.activeProfileId
        ? String(dbUser.activeProfileId)
        : null,
    },
    profiles: profiles.map((p) => ({
      id: String(p._id),
      type: p.type,
      status: p.status,
      displayName: p.displayName,
      verifiedAt: p.verifiedAt || null,
    })),
  });
}
