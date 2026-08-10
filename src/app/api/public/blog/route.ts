import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { BlogPost } from "@/models/BlogPost";

export async function GET() {
  await connectDB();

  const posts = await BlogPost.find({ status: "published" })
    .sort({ publishedAt: -1, createdAt: -1 })
    .select("title slug excerpt featuredImageUrl publishedAt")
    .lean();

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: String(p._id),
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      featuredImageUrl: p.featuredImageUrl || "",
      publishedAt: p.publishedAt || null,
    })),
  });
}
