import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { requireActiveProfile } from "@/lib/profile-context";
import { MaintenanceRequest } from "@/models/MaintenanceRequest";
import { Listing } from "@/models/Listing";

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, [
    "landlord",
    "estate_manager",
  ]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  await connectDB();
  const ownedListings = await Listing.find({ ownerUserId: user.id })
    .select("_id title")
    .lean();
  const ownedIds = ownedListings.map((l) => l._id);

  const openRows = await MaintenanceRequest.find({
    listingId: { $in: ownedIds },
    status: { $in: ["open", "assigned", "in_progress"] },
  })
    .select("listingId priority status createdAt")
    .lean();

  const byListing = new Map<string, number>();
  let highPriority = 0;
  for (const r of openRows) {
    const key = String(r.listingId);
    byListing.set(key, (byListing.get(key) || 0) + 1);
    if (r.priority === "high") highPriority += 1;
  }

  const titleMap = new Map(ownedListings.map((l) => [String(l._id), l.title]));
  const hotspots = [...byListing.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([listingId, count]) => ({
      listingId,
      title: titleMap.get(listingId) || "Listing",
      openCount: count,
    }));

  const insights: {
    level: "info" | "warning" | "critical";
    title: string;
    detail: string;
  }[] = [];

  if (openRows.length === 0) {
    insights.push({
      level: "info",
      title: "All clear",
      detail:
        "No open maintenance tickets on your listings. Predictive models look stable.",
    });
  } else {
    insights.push({
      level: openRows.length >= 5 ? "warning" : "info",
      title: `${openRows.length} open request${openRows.length === 1 ? "" : "s"}`,
      detail:
        "Volume suggests scheduling a weekly facilities walkthrough for high-activity units.",
    });
  }

  if (highPriority >= 2) {
    insights.push({
      level: "critical",
      title: "Elevated high-priority backlog",
      detail: `${highPriority} high-priority tickets need assignment within 48 hours to reduce repeat failures.`,
    });
  }

  if (hotspots[0] && hotspots[0].openCount >= 2) {
    insights.push({
      level: "warning",
      title: `Hotspot: ${hotspots[0].title}`,
      detail: `${hotspots[0].openCount} open tickets — check plumbing/electrical patterns before peak rainy season.`,
    });
  }

  return NextResponse.json({
    insights,
    summary: {
      openCount: openRows.length,
      highPriority,
      hotspots,
    },
  });
}
