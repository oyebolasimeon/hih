import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { connectDB } from "@/lib/db";
import { BlogPost } from "@/models/BlogPost";

export const dynamic = "force-dynamic";

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await connectDB();

  const post = await BlogPost.findOne({
    slug: slug.toLowerCase(),
    status: "published",
  }).lean();

  if (!post) {
    notFound();
  }

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-16 sm:pb-24 bg-white min-h-screen">
        <article className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 space-y-6">
          <Link href="/blog" className="text-sm text-brand font-medium hover:underline">
            ← Back to blog
          </Link>
          <header className="space-y-3">
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
              {post.title}
            </h1>
            {post.publishedAt ? (
              <p className="text-sm text-muted">
                {new Date(post.publishedAt).toLocaleDateString("en-NG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {post.authorName ? ` · ${post.authorName}` : ""}
              </p>
            ) : null}
            <p className="text-muted leading-relaxed">{post.excerpt}</p>
          </header>
          {post.featuredImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.featuredImageUrl}
              alt=""
              className="w-full max-h-[420px] object-cover"
            />
          ) : null}
          <div className="prose prose-neutral max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
            {post.body}
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
