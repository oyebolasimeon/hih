import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { assertInvestor } from "@/lib/api-auth";
import { actorFromUser, writeAudit } from "@/lib/audit";

export async function GET() {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  await connectDB();
  const doc = await User.findById(user.id)
    .select("starredImageUrls bookmarkedImageUrls")
    .lean();

  return NextResponse.json({
    starredUrls: doc?.starredImageUrls || [],
    bookmarkedUrls: doc?.bookmarkedImageUrls || [],
  });
}

const schema = z.object({
  starredUrls: z.array(z.string().min(1)).max(500).optional(),
  bookmarkedUrls: z.array(z.string().min(1)).max(500).optional(),
});

export async function PATCH(request: Request) {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid media preferences." }, { status: 400 });
  }

  await connectDB();
  const updates: Record<string, unknown> = {};
  if (parsed.data.starredUrls) updates.starredImageUrls = parsed.data.starredUrls;
  if (parsed.data.bookmarkedUrls) {
    updates.bookmarkedImageUrls = parsed.data.bookmarkedUrls;
  }

  const doc = await User.findByIdAndUpdate(user.id, updates, { new: true })
    .select("starredImageUrls bookmarkedImageUrls")
    .lean();

  await writeAudit({
    action: "user.media_prefs_update",
    summary: "Updated starred / bookmarked property images",
    actor: actorFromUser(user),
    entityType: "User",
    entityId: user.id,
    investorId: user.isAdmin ? null : user.id,
    investorVisible: !user.isAdmin,
    metadata: {
      starredCount: doc?.starredImageUrls?.length || 0,
      bookmarkedCount: doc?.bookmarkedImageUrls?.length || 0,
    },
    request,
  });

  return NextResponse.json({
    starredUrls: doc?.starredImageUrls || [],
    bookmarkedUrls: doc?.bookmarkedImageUrls || [],
  });
}
