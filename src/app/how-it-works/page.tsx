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
    body: "Find or list property through a digital marketplace built for Nigeria.",
    image: "/brand/housing-story-campaign.jpg",
  },
  {
    n: "02",
    title: "Verify",
    body: "Verify users and review relevant property information before participation.",
    image: "/brand/control-campaign.jpg",
  },
  {
    n: "03",
    title: "Connect",
    body: "Talk directly with the other party — no unnecessary middleman layers.",
    image: "/brand/dreamed-it-campaign.jpg",
  },
  {
    n: "04",
    title: "Agree",
    body: "Organize applications, terms and digital agreements in one place.",
    image: "/brand/renting-stress-campaign.jpg",
  },
  {
    n: "05",
    title: "Pay",
    body: "Pay rent and property charges through the platform and regulated partners.",
    image: "/hero-home.jpg",
  },
  {
    n: "06",
    title: "Manage",
    body: "Run tenants, maintenance, occupancy, documents and day-to-day operations.",
    image: "/home-interior.jpg",
  },
  {
    n: "07",
    title: "Understand",
    body: "Track income, expenses, occupancy and portfolio performance.",
    image: "/brand/stakeholder-meeting-flyer.png",
  },
  {
    n: "08",
    title: "Grow",
    body: "Use property intelligence and services to improve decisions over time.",
    image: "/brand/housing-story-campaign.jpg",
  },
];

const pillars = [
  {
    title: "Tenants",
    image: "/brand/dreamed-it-campaign.jpg",
    steps: [
      "Search verified homes",
      "Understand pricing and apply directly",
      "Keep records of your rental journey",
      "Pay rent and manage your tenancy",
    ],
  },
  {
    title: "Landlords",
    image: "/brand/control-campaign.jpg",
    steps: [
      "List and verify properties",
      "Connect with applicants directly",
      "Collect rent and store documents",
      "Coordinate maintenance remotely",
    ],
  },
  {
    title: "Property managers",
    image: "/brand/housing-story-campaign.jpg",
    steps: [
      "Centralise the portfolio workspace",
      "Track occupancy and lease cycles",
      "Manage collections and reminders",
      "Assign maintenance and keep history",
    ],
  },
  {
    title: "Developers & investors",
    image: "/brand/renting-stress-campaign.jpg",
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
        <section className="relative min-h-[58svh] overflow-hidden bg-navy text-sand sm:min-h-[64svh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/control-campaign.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/88 to-navy/55" />
          <div className="relative mx-auto flex min-h-[58svh] max-w-7xl flex-col justify-end px-5 pb-14 pt-28 sm:min-h-[64svh] sm:px-6 sm:pb-20 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              How it works
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              One connected property journey
            </h1>
            <p className="mt-5 max-w-xl text-sand/75 text-lg leading-relaxed">
              From discovery to portfolio growth — House In Hands connects the
              full lifecycle without unnecessary friction.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="site-btn site-btn-teal">
                Create your account
              </Link>
              <Link href="/listings" className="site-btn site-btn-ghost">
                Browse listings
              </Link>
            </div>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">The journey</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Eight steps. One platform.
            </h2>
            <ol className="mt-12 space-y-6">
              {journey.map((step, i) => {
                const reverse = i % 2 === 1;
                return (
                  <li
                    key={step.n}
                    className={`grid items-stretch gap-0 overflow-hidden border border-navy/10 bg-surface lg:grid-cols-2 ${
                      reverse ? "lg:[&>*:first-child]:order-2" : ""
                    }`}
                  >
                    <div className="relative min-h-[220px] bg-navy/5 lg:min-h-[280px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={step.image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                      <span className="font-mono text-sm text-teal">{step.n}</span>
                      <h3 className="mt-3 font-display text-2xl font-semibold text-navy sm:text-3xl">
                        {step.title}
                      </h3>
                      <p className="mt-3 max-w-md text-base leading-relaxed text-muted">
                        {step.body}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className="site-section bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              By role
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for every participant
            </h2>
            <div className="mt-12 grid gap-5 sm:grid-cols-2">
              {pillars.map((p) => (
                <article
                  key={p.title}
                  className="overflow-hidden border border-white/10 bg-navy-deep/40"
                >
                  <div className="relative aspect-[16/9]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.image}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover opacity-80"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy/40 to-transparent" />
                    <h3 className="absolute bottom-4 left-4 font-display text-2xl font-semibold">
                      {p.title}
                    </h3>
                  </div>
                  <ol className="space-y-3 p-5 sm:p-6">
                    {p.steps.map((step, i) => (
                      <li key={step} className="flex gap-3 text-sand/80">
                        <span className="font-mono text-sm text-teal">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="text-sm sm:text-base">{step}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
            <div className="mt-12 flex flex-wrap gap-3">
              <Link href="/register" className="site-btn site-btn-teal">
                Create your account
              </Link>
              <Link href="/pricing" className="site-btn site-btn-ghost">
                See how pricing works
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
