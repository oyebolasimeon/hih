import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClosingCta from "@/components/ClosingCta";

const pillars = [
  {
    title: "Students",
    steps: [
      "Create a Student profile",
      "Complete KYC + student ID review",
      "Search hostels and term-friendly homes",
      "Apply, sign, and settle rent",
    ],
  },
  {
    title: "Tenants",
    steps: [
      "Verify your identity",
      "Filter by city, price, and type",
      "Apply with a clear timeline",
      "Sign digitally and pay on schedule",
    ],
  },
  {
    title: "Landlords",
    steps: [
      "List with photos and terms",
      "Get verified before going live",
      "Review applicants with KYC context",
      "Collect rent and track occupancy",
    ],
  },
  {
    title: "Estate managers",
    steps: [
      "Onboard the portfolio",
      "Assign units and lease cycles",
      "Message residents at scale",
      "Read analytics on collection & vacancy",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <div className="site-page">
      <Navbar />
      <main className="pt-28">
        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              How it works
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              From first search to an active lease
            </h1>
            <p className="mt-5 max-w-xl text-sand/70 text-lg leading-relaxed">
              Every role follows a short, verified path — so housing moves
              forward without chaos.
            </p>
          </div>
        </section>

        <section className="site-section">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            {pillars.map((p) => (
              <div key={p.title} className="border-t border-navy/15 pt-8">
                <h2 className="font-display text-2xl font-semibold text-navy sm:text-3xl">
                  {p.title}
                </h2>
                <ol className="mt-6 space-y-4">
                  {p.steps.map((step, i) => (
                    <li key={step} className="flex gap-4 text-muted">
                      <span className="font-mono text-sm text-teal">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-base text-navy/80">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-14 max-w-7xl px-5 sm:px-6 lg:px-8">
            <Link href="/register" className="site-btn site-btn-teal">
              Create your account
            </Link>
          </div>
        </section>

        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
