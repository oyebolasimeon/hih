import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmptyState from "@/components/ui/EmptyState";
import { connectDB } from "@/lib/db";
import { FaqItem } from "@/models/FaqItem";

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  await connectDB();
  const faqs = await FaqItem.find({ published: true })
    .sort({ order: 1, createdAt: -1 })
    .lean();

  return (
    <div className="site-page">
      <Navbar />
      <main className="pt-28">
        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              FAQ
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Answers before you sign
            </h1>
          </div>
        </section>
        <section className="site-section">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            {faqs.length === 0 ? (
              <EmptyState
                title="No FAQs yet"
                description="Common questions will appear here soon."
              />
            ) : (
              <div className="divide-y divide-border">
                {faqs.map((item) => (
                  <div key={String(item._id)} className="py-8">
                    <h2 className="font-display text-xl font-semibold text-navy">
                      {item.question}
                    </h2>
                    <p className="mt-3 text-muted leading-relaxed whitespace-pre-wrap">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
