import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="site-page">
      <Navbar />
      <main className="pt-28">
        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              Pricing
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Clear rates. No surprises on rent day.
            </h1>
            <p className="mt-4 max-w-xl text-sand/70">
              Core search and profile setup stay approachable. Listing and
              estate tools will publish with transparent landlord options.
            </p>
          </div>
        </section>
        <section className="site-section">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Coming soon</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-navy">
              Plans for every side of the lease
            </h2>
            <p className="mt-4 text-muted leading-relaxed">
              We are finalising rates for listing placement, featured search, and
              estate management seats. Until then — create an account and explore
              the product.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="site-btn site-btn-teal">
                Get started
              </Link>
              <Link href="/contact" className="site-btn site-btn-outline">
                Talk to us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
