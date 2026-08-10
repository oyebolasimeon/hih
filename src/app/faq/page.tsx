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
    <>
      <Navbar />
      <main className="pt-28 pb-16 sm:pb-24 bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8">
          <p className="text-brand font-medium text-sm uppercase tracking-wider">
            FAQ
          </p>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-foreground">
            Frequently asked questions
          </h1>

          {faqs.length === 0 ? (
            <div className="mt-10">
              <EmptyState
                title="No FAQs yet"
                description="Common questions will appear here soon."
              />
            </div>
          ) : (
            <div className="mt-10 divide-y divide-border">
              {faqs.map((item) => (
                <div key={String(item._id)} className="py-6">
                  <h2 className="font-semibold text-foreground">{item.question}</h2>
                  <p className="mt-2 text-sm text-muted leading-relaxed whitespace-pre-wrap">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
