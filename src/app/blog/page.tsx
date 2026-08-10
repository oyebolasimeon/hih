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
    <>
      <Navbar />
      <main className="pt-28 pb-16 sm:pb-24 bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 space-y-8">
          <div>
            <p className="text-brand font-medium text-sm uppercase tracking-wider">
              Blog
            </p>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-foreground">
              Housing tips & updates
            </h1>
            <p className="mt-4 text-muted">
              Guides for renters, landlords, and estate managers across Nigeria.
            </p>
          </div>

          {posts.length === 0 ? (
            <EmptyState
              title="No posts yet"
              description="Check back soon for housing tips and platform updates."
            />
          ) : (
            <ul className="divide-y divide-border">
              {posts.map((post) => (
                <li key={String(post._id)} className="py-6">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block space-y-2"
                  >
                    <h2 className="font-semibold text-foreground group-hover:text-brand transition-colors">
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
                    <p className="text-sm text-muted leading-relaxed">
                      {post.excerpt}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
