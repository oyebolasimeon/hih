import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { connectDB } from "@/lib/db";
import { BlogPost } from "@/models/BlogPost";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getSiteUrl } from "@/lib/seo/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  await connectDB();
  const post = await BlogPost.findOne({
    slug: slug.toLowerCase(),
    status: "published",
  }).lean();
  if (!post) return { title: "Story" };
  return buildPageMetadata({
    title: post.seo?.metaTitle || post.title,
    description: post.seo?.metaDescription || post.excerpt || post.title,
    path: `/blog/${post.slug}`,
    image: post.seo?.ogImageUrl || post.featuredImageUrl || undefined,
    type: "article",
    keywords: post.tags || [],
  });
}

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

  const url = getSiteUrl();

  return (
    <>
      <Navbar />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          image: post.featuredImageUrl || undefined,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          author: {
            "@type": "Person",
            name: post.authorName || "House In Hands",
          },
          publisher: {
            "@type": "Organization",
            name: "House In Hands",
            logo: { "@type": "ImageObject", url: `${url}/logo.png` },
          },
          mainEntityOfPage: `${url}/blog/${post.slug}`,
        }}
      />
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
