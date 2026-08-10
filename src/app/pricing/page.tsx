import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-16 sm:pb-24 bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 space-y-8">
          <div>
            <p className="text-brand font-medium text-sm uppercase tracking-wider">
              Pricing
            </p>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-foreground">
              Simple plans for housing in Nigeria
            </h1>
            <p className="mt-4 text-muted">
              Public pricing details will publish with MVP. Core search and
              profile setup will stay approachable for renters; listing and
              estate tools will have clear landlord/manager options.
            </p>
          </div>
          <div className="app-card p-6 space-y-3">
            <h2 className="font-display text-xl font-semibold">Coming soon</h2>
            <p className="text-sm text-muted">
              We are finalising rates for listing placement, featured search, and
              estate management seats.
            </p>
            <Link href="/contact" className="app-btn app-btn-primary text-sm inline-flex">
              Talk to us
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
