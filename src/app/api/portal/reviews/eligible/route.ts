import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { getReviewableListings } from "@/lib/property-access";
import { requireActiveProfile } from "@/lib/profile-context";

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, ["tenant", "student"]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const listings = await getReviewableListings(user.id, active.profile._id);

  return NextResponse.json({ listings });
}
