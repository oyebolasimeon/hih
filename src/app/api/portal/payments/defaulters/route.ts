import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { getDefaultersForLandlordProfiles } from "@/lib/rent-defaulters";
import { requireActiveProfile } from "@/lib/profile-context";
import { Profile } from "@/models/Profile";

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, [
    "landlord",
    "estate_manager",
  ]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const url = new URL(req.url);
  const includeDueSoon = url.searchParams.get("includeDueSoon") === "1";

  await connectDB();
  const profileIds = (
    await Profile.find({
      userId: user.id,
      type: { $in: ["landlord", "estate_manager"] },
    })
      .select("_id")
      .lean()
  ).map((p) => p._id);

  const defaulters = await getDefaultersForLandlordProfiles(profileIds, {
    includeDueSoon,
  });

  const dueSoon = includeDueSoon
    ? defaulters.filter((d) => !d.isDefaulter && d.rent?.dueSoon)
    : [];

  const overdue = defaulters.filter((d) => d.isDefaulter);

  return NextResponse.json({
    defaulters: overdue,
    dueSoon,
    counts: {
      overdue: overdue.length,
      dueSoon: dueSoon.length,
    },
  });
}
