import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const values = [
  {
    title: "Trust",
    body: "Every relationship starts with confidence in who is involved, what is being offered and how the transaction is handled.",
  },
  {
    title: "Transparency",
    body: "Users should understand prices, terms, processes, records and responsibilities without unnecessary opacity.",
  },
  {
    title: "Innovation",
    body: "We use technology to automate repetitive work, connect fragmented processes and create better property experiences.",
  },
  {
    title: "Ownership",
    body: "People should have greater control over their properties, money, records, decisions and property journeys.",
  },
  {
    title: "People First",
    body: "Behind every listing is a real person looking for stability. Behind every property is a real person protecting their life's investment. We build for real people and the realities of the Nigerian market.",
  },
];

const building = [
  {
    title: "Property Marketplace",
    body: "Verified properties and direct connections between property owners and prospective tenants/buyers.",
  },
  {
    title: "Property Management",
    body: "A landlord workspace for properties, tenants, leases, rent, maintenance, occupancy and documents.",
  },
  {
    title: "Payments & Financial Workflows",
    body: "Rent, utilities, service charges, collection and payment workflows supported through appropriate payment infrastructure and partners.",
  },
  {
    title: "Property Services",
    body: "A connected network for maintenance, cleaning, inspections, repairs and other property needs.",
  },
  {
    title: "Property Intelligence",
    body: "Aggregated market and portfolio data that can help owners, developers, investors and property professionals make better decisions.",
  },
  {
    title: "AI & Analytics",
    body: "A future layer for pricing intelligence, property estimates, demand signals, fraud detection and portfolio insights as data maturity grows.",
  },
];

const promise = [
  "Property management — property profiles, pricing, documents, lease records and portfolio organization.",
  "Tenant management — tenant profiles, occupancy, lease dates, communication and payment history.",
  "Rent and payment management — collections, reminders, receipts, service charges and reconciliation workflows.",
  "Maintenance management — requests, approvals, service-provider assignment, progress tracking and maintenance history.",
  "Occupancy management — occupied/vacant units, upcoming lease expiries, vacancy periods and occupancy performance.",
  "Property performance — income, expenses, yield indicators and portfolio-level visibility.",
];

const ecosystem = [
  {
    title: "Tenants",
    body: "Search verified homes, understand pricing, apply directly, keep records and manage their rental journey.",
  },
  {
    title: "Landlords",
    body: "List properties, manage tenants, collect rent, coordinate maintenance and monitor assets remotely.",
  },
  {
    title: "Developers & Estate Builders",
    body: "Showcase developments, manage inventory, reach prospective customers and gain market visibility.",
  },
  {
    title: "Property Managers",
    body: "Manage portfolios, occupancy, leases, maintenance, collections and records from a central workspace.",
  },
  {
    title: "Investors & Analysts",
    body: "Use property and market intelligence to assess locations, assets, trends and portfolio performance.",
  },
  {
    title: "Service Providers",
    body: "Access property-related service opportunities through a structured digital ecosystem.",
  },
];

export default function AboutPage() {
  return (
    <div className="site-page">
      <Navbar />
      <main className="pt-28">
        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              About House In Hands
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Housing you can trust
            </h1>
            <p className="mt-3 font-display text-xl text-sand/85 sm:text-2xl">
              Property. In Your Hands.
            </p>
            <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-teal">
              Find it. Rent it. Manage it. Grow it.
            </p>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-sand/70 sm:text-lg">
              House In Hands (HIH) is a property technology company that
              connects people, properties, payments, services and property
              intelligence in one trusted digital ecosystem. We are building a
              simpler way to discover, transact, manage and understand property
              — without unnecessary friction or dependence on traditional
              middlemen.
            </p>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Our Story</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Finding a home should not feel like a battle
            </h2>
            <div className="mt-6 space-y-5 text-base leading-relaxed text-muted sm:text-lg">
              <p>
                House In Hands was born out of a simple belief that finding a
                home should not feel like a battle.
              </p>
              <p>
                For years, millions of Nigerians have navigated a rental market
                where tenants can face opaque fees, unreliable listings,
                unnecessary intermediaries and weak post-rental support.
                Landlords face a different but connected problem: managing
                tenants, payments, maintenance and occupancy becomes difficult
                when property information is fragmented across agents,
                spreadsheets, notebooks, bank transfers and messaging apps.
              </p>
              <p>
                Our answer to this fragmented process is a platform built around
                trust, transparency, ownership and practical digital tools.
              </p>
            </div>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
            <div>
              <p className="site-kicker">Our Vision</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
                Africa&apos;s most trusted property technology ecosystem
              </h2>
              <p className="mt-4 text-muted leading-relaxed">
                To become Africa&apos;s most trusted and intelligent property
                technology ecosystem, making property ownership, renting and
                management more accessible, transparent, connected and
                data-driven.
              </p>
            </div>
            <div>
              <p className="site-kicker">Our Mission</p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-navy sm:text-3xl">
                Simpler housing transactions and property management
              </h2>
              <p className="mt-4 text-muted leading-relaxed">
                To make housing transactions and property management simpler,
                more transparent and more accessible by connecting people,
                properties, payments, services and data in one trusted digital
                ecosystem.
              </p>
            </div>
          </div>
        </section>

        <section className="site-section bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              Our Core Values
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              What we build on
            </h2>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {values.map((v, i) => (
                <li key={v.title} className="border-t border-white/15 pt-6">
                  <span className="font-mono text-sm text-teal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-sand">
                    {v.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-sand/65">
                    {v.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">What We Are Building</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              A property operating and transaction platform
            </h2>
            <p className="mt-4 max-w-2xl text-muted leading-relaxed">
              House In Hands is not simply a property listing website. The goal
              is to connect the full property lifecycle: discovery, verification,
              direct landlord–tenant interaction, digital agreements, payments,
              property management, maintenance, occupancy, services and property
              intelligence.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {building.map((item) => (
                <div key={item.title} className="border-t border-navy/15 pt-6">
                  <h3 className="font-display text-xl font-semibold text-navy">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Property Management Promise</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              A digital control centre for the portfolio
            </h2>
            <p className="mt-4 max-w-2xl text-muted leading-relaxed">
              For landlords and property managers, HIH is designed to become a
              digital control centre — whether the owner has one property or a
              growing estate. Manage properties remotely, track tenants and
              leases, monitor collections, coordinate maintenance, store records
              and understand portfolio performance from one place.
            </p>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {promise.map((line) => (
                <li
                  key={line}
                  className="flex gap-3 text-sm leading-relaxed text-navy/80"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Our Broader Ecosystem</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Built for every side of property
            </h2>
            <p className="mt-4 max-w-2xl text-muted leading-relaxed">
              House In Hands is designed to serve the major participants in the
              property ecosystem rather than only one side of the market.
            </p>
            <div className="mt-12 grid gap-px bg-navy/10 sm:grid-cols-2 lg:grid-cols-3">
              {ecosystem.map((item) => (
                <div key={item.title} className="bg-sand p-6 sm:p-8">
                  <h3 className="font-display text-xl font-semibold text-navy">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-14 flex flex-wrap gap-3">
              <Link href="/register" className="site-btn site-btn-teal">
                Join the platform
              </Link>
              <Link href="/how-it-works" className="site-btn site-btn-outline">
                How it works
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
