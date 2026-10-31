import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClosingCta from "@/components/ClosingCta";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "How House Hunting Works in Nigeria",
  description:
    "See how House In Hands makes house hunting clearer in Lagos, Abuja and across Nigeria — discover, verify, connect, agree and manage property digitally.",
  path: "/how-it-works",
  keywords: [
    "how house hunting works Nigeria",
    "rent without agent Nigeria",
    "digital tenancy Nigeria",
  ],
});

const journey = [
  {
    n: "01",
    title: "Discover",
    body: "Find or list property through a digital marketplace.",
  },
  {
    n: "02",
    title: "Verify",
    body: "Verify users and review relevant property information before participation.",
  },
  {
    n: "03",
    title: "Connect",
    body: "Enable direct communication between the parties involved.",
  },
  {
    n: "04",
    title: "Agree",
    body: "Organize applications, terms and digital agreements.",
  },
  {
    n: "05",
    title: "Pay",
    body: "Facilitate rent and relevant property payments through the platform and appropriate regulated partners.",
  },
  {
    n: "06",
    title: "Manage",
    body: "Manage tenants, maintenance, occupancy, documents and property operations.",
  },
  {
    n: "07",
    title: "Understand",
    body: "Track income, expenses, occupancy and portfolio performance.",
  },
  {
    n: "08",
    title: "Grow",
    body: "Use property intelligence and services to make better operating and investment decisions.",
  },
];

const pillars = [
  {
    title: "Tenants",
    steps: [
      "Search verified homes",
      "Understand pricing and apply directly",
      "Keep records of your rental journey",
      "Pay rent and manage your tenancy",
    ],
  },
  {
    title: "Landlords",
    steps: [
      "List and verify properties",
      "Connect with applicants directly",
      "Collect rent and store documents",
      "Coordinate maintenance remotely",
    ],
  },
  {
    title: "Property managers",
    steps: [
      "Centralise the portfolio workspace",
      "Track occupancy and lease cycles",
      "Manage collections and reminders",
      "Assign maintenance and keep history",
    ],
  },
  {
    title: "Developers & investors",
    steps: [
      "Showcase developments and inventory",
      "Reach prospective customers",
      "Gain market visibility",
      "Use property intelligence over time",
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
              One connected property journey
            </h1>
            <p className="mt-5 max-w-xl text-sand/70 text-lg leading-relaxed">
              From discovery to portfolio growth — House In Hands connects the
              full lifecycle without unnecessary friction.
            </p>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {journey.map((step) => (
                <li key={step.n} className="border-t border-navy/15 pt-6">
                  <span className="font-mono text-sm text-teal">{step.n}</span>
                  <h2 className="mt-3 font-display text-xl font-semibold text-navy sm:text-2xl">
                    {step.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">By role</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Built for every participant
            </h2>
            <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-16">
              {pillars.map((p) => (
                <div key={p.title} className="border-t border-navy/15 pt-8">
                  <h3 className="font-display text-2xl font-semibold text-navy">
                    {p.title}
                  </h3>
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
            <div className="mt-14">
              <Link href="/register" className="site-btn site-btn-teal">
                Create your account
              </Link>
            </div>
          </div>
        </section>

        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
