import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { requireActiveProfile } from "@/lib/profile-context";
import { getAccessibleProperties } from "@/lib/property-access";

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const properties = await getAccessibleProperties(user.id, active.profile);
  return NextResponse.json({ properties });
}
