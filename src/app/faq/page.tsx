import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { FAQ_SECTIONS } from "@/lib/faq-content";
import { connectDB } from "@/lib/db";
import { FaqItem } from "@/models/FaqItem";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FAQ | House In Hands",
  description:
    "Frequently asked questions about House In Hands — housing, rentals, property management, payments, verification and support.",
};

export default async function FaqPage() {
  let cmsFaqs: Array<{ id: string; question: string; answer: string }> = [];
  try {
    await connectDB();
    const docs = await FaqItem.find({ published: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();
    cmsFaqs = docs.map((item) => ({
      id: String(item._id),
      question: item.question,
      answer: item.answer,
    }));
  } catch {
    /* static FAQ still renders */
  }

  return (
    <div className="site-page">
      <Navbar />
      <main className="pt-28">
        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              FAQ
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Frequently asked questions
            </h1>
            <p className="mt-4 max-w-2xl text-sand/70 text-lg leading-relaxed">
              Property. In Your Hands. — clear answers on how House In Hands
              works for tenants, landlords, students, managers and developers.
            </p>
          </div>
        </section>

        <section className="border-b border-border bg-sand">
          <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6 lg:px-8">
            <nav
              aria-label="FAQ sections"
              className="flex flex-wrap gap-x-4 gap-y-2"
            >
              {FAQ_SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="text-sm font-medium text-navy/70 transition-colors hover:text-teal-dark"
                >
                  {section.title}
                </a>
              ))}
              {cmsFaqs.length > 0 ? (
                <a
                  href="#more"
                  className="text-sm font-medium text-navy/70 transition-colors hover:text-teal-dark"
                >
                  More questions
                </a>
              ) : null}
            </nav>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8 space-y-16">
            {FAQ_SECTIONS.map((section) => (
              <div key={section.id} id={section.id} className="scroll-mt-28">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
                  {section.title}
                </h2>
                <div className="mt-6 divide-y divide-border border-t border-border">
                  {section.items.map((item) => (
                    <details key={item.q} className="group py-5">
                      <summary className="cursor-pointer list-none font-display text-lg font-semibold text-navy marker:content-none [&::-webkit-details-marker]:hidden">
                        <span className="flex items-start justify-between gap-4">
                          <span>{item.q}</span>
                          <span
                            aria-hidden
                            className="mt-1 shrink-0 text-teal transition group-open:rotate-45"
                          >
                            +
                          </span>
                        </span>
                      </summary>
                      <p className="mt-3 text-muted leading-relaxed">{item.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            ))}

            {cmsFaqs.length > 0 ? (
              <div id="more" className="scroll-mt-28">
                <h2 className="font-display text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
                  More questions
                </h2>
                <div className="mt-6 divide-y divide-border border-t border-border">
                  {cmsFaqs.map((item) => (
                    <details key={item.id} className="group py-5">
                      <summary className="cursor-pointer list-none font-display text-lg font-semibold text-navy marker:content-none [&::-webkit-details-marker]:hidden">
                        <span className="flex items-start justify-between gap-4">
                          <span>{item.question}</span>
                          <span
                            aria-hidden
                            className="mt-1 shrink-0 text-teal transition group-open:rotate-45"
                          >
                            +
                          </span>
                        </span>
                      </summary>
                      <p className="mt-3 text-muted leading-relaxed whitespace-pre-wrap">
                        {item.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
            <p className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Property. In Your Hands.
            </p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-teal">
              Find it. Rent it. Manage it. Grow it.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-sand/70">
              <a
                href="mailto:houseinhandsmail@gmail.com"
                className="text-teal hover:text-teal-light transition-colors"
              >
                houseinhandsmail@gmail.com
              </a>
              <span className="text-sand/30">·</span>
              <a
                href="tel:+2347015079484"
                className="text-teal hover:text-teal-light transition-colors"
              >
                +234 701 507 9484
              </a>
              <span className="text-sand/30">·</span>
              <Link
                href="/contact"
                className="text-teal hover:text-teal-light transition-colors"
              >
                Contact us
              </Link>
              <span className="text-sand/30">·</span>
              <Link
                href="/legal/terms"
                className="text-teal hover:text-teal-light transition-colors"
              >
                Terms
              </Link>
              <span className="text-sand/30">·</span>
              <Link
                href="/legal/privacy"
                className="text-teal hover:text-teal-light transition-colors"
              >
                Privacy
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
