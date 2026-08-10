import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { BlogPost } from "@/models/BlogPost";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  await connectDB();

  const { slug } = await context.params;
  const post = await BlogPost.findOne({
    slug: slug.toLowerCase(),
    status: "published",
  }).lean();

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({
    post: {
      id: String(post._id),
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      body: post.body,
      featuredImageUrl: post.featuredImageUrl || "",
      authorName: post.authorName || "",
      publishedAt: post.publishedAt || null,
    },
  });
}
