import { NextResponse } from "next/server";
import { getActiveModalAnnouncement } from "@/lib/announcements";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const announcement = await getActiveModalAnnouncement();
    return NextResponse.json(
      { announcement },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("active announcement:", err);
    return NextResponse.json({ announcement: null });
  }
}
