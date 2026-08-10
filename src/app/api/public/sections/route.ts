import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { PageSection } from "@/models/PageSection";

export async function GET(request: Request) {
  await connectDB();

  const pageKey =
    new URL(request.url).searchParams.get("pageKey")?.trim() || "home";

  const sections = await PageSection.find({
    pageKey,
    status: "published",
  })
    .sort({ order: 1, sectionKey: 1 })
    .lean();

  return NextResponse.json({
    pageKey,
    sections: sections.map((s) => ({
      id: String(s._id),
      pageKey: s.pageKey,
      sectionKey: s.sectionKey,
      title: s.title || "",
      data: s.data || {},
      order: s.order,
    })),
  });
}
