import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmptyState from "@/components/ui/EmptyState";
import { connectDB } from "@/lib/db";
import { BlogPost } from "@/models/BlogPost";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  await connectDB();
  const posts = await BlogPost.find({ status: "published" })
    .sort({ publishedAt: -1, createdAt: -1 })
    .select("title slug excerpt featuredImageUrl publishedAt")
    .lean();

  return (
    <div className="site-page">
      <Navbar />
      <main className="pt-28">
        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              Stories
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Housing tips & updates
            </h1>
            <p className="mt-4 max-w-xl text-sand/70">
              Guides for renters, landlords, and estate managers across Nigeria.
            </p>
          </div>
        </section>
        <section className="site-section">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            {posts.length === 0 ? (
              <EmptyState
                title="No posts yet"
                description="Check back soon for housing tips and platform updates."
              />
            ) : (
              <ul className="divide-y divide-border">
                {posts.map((post) => (
                  <li key={String(post._id)} className="py-8">
                    <Link href={`/blog/${post.slug}`} className="group block space-y-2">
                      <h2 className="font-display text-2xl font-semibold text-navy group-hover:text-teal-dark transition-colors">
                        {post.title}
                      </h2>
                      {post.publishedAt ? (
                        <p className="text-xs text-muted">
                          {new Date(post.publishedAt).toLocaleDateString("en-NG", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      ) : null}
                      <p className="text-muted leading-relaxed">{post.excerpt}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
