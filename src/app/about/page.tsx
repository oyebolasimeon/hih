import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Why House In Hands | Housing you can trust",
  description:
    "A property technology company rebuilding property around direct relationships, verification, transparency, digital management and connected services.",
};

const lifecycle = [
  {
    title: "Find",
    body: "Discover properties through a structured digital marketplace.",
  },
  {
    title: "Connect",
    body: "Create direct communication between verified participants.",
  },
  {
    title: "Transact",
    body: "Organize applications, agreements and payment workflows.",
  },
  {
    title: "Manage",
    body: "Give owners and managers a central workspace for their portfolios.",
  },
  {
    title: "Maintain",
    body: "Connect maintenance requests to approvals, providers and records.",
  },
  {
    title: "Monitor",
    body: "Track rent, occupancy, leases, expenses and property activity.",
  },
  {
    title: "Analyze",
    body: "Turn aggregated property activity into market and portfolio insight.",
  },
  {
    title: "Grow",
    body: "Help stakeholders use better information and services to improve outcomes.",
  },
];

const stakeholderBlocks = [
  {
    title: "Why it matters to tenants",
    points: [
      "Direct access to property owners or authorized property managers without unnecessary intermediary layers.",
      "Clearer visibility into rent, service charges and other applicable costs before commitment.",
      "Identity and property verification processes designed to reduce avoidable fraud and uncertainty.",
      "Digital agreements and records that keep important tenancy information accessible.",
      "Digital rent and property-payment workflows through appropriate payment infrastructure.",
      "Direct communication and structured maintenance requests rather than fragmented conversations.",
    ],
  },
  {
    title: "Why it matters to landlords",
    points: [
      "Access to a platform designed to attract verified prospective tenants and reduce dependence on traditional agent channels.",
      "Remote property management — manage properties, tenants and portfolio activity from wherever you are.",
      "Centralized rent collection workflows, payment history, reminders and records.",
      "Tenant and lease management with occupancy and expiry visibility.",
      "Maintenance management from request through approval, assignment, completion and cost recording.",
      "Property performance visibility — income, expenses, occupancy and useful portfolio indicators.",
      "Optional property services and management support as the HIH ecosystem expands.",
    ],
  },
  {
    title: "Why it matters to developers & estate builders",
    points: [
      "Digital visibility for new and existing developments.",
      "Structured inventory management across units, pricing, availability and status.",
      "Direct access to prospective buyers or tenants through the HIH ecosystem.",
      "Lead and enquiry tracking that reduces reliance on disconnected channels.",
      "Portfolio, occupancy and demand visibility to support development decisions.",
      "Potential access to property intelligence and market trends as the platform’s data layer grows.",
    ],
  },
  {
    title: "Why it matters to property managers & estate managers",
    points: [
      "Bulk property and unit listing tools.",
      "Portfolio-level occupancy, rent collection and lease-expiry visibility.",
      "Centralized tenant records and communication workflows.",
      "Maintenance ticketing and service-provider coordination.",
      "Digital property records, reports and operational history.",
      "A scalable operating layer that reduces dependence on spreadsheets and fragmented third-party processes.",
    ],
  },
  {
    title: "Why it matters to investors, analysts & property professionals",
    points: [
      "A future-facing property intelligence layer built from appropriately governed, aggregated platform activity.",
      "Potential insight into rental patterns, occupancy, demand, pricing and portfolio performance.",
      "Location and property comparisons that can support investment and development decisions.",
      "Analytics that evolve as the platform generates larger, higher-quality datasets.",
    ],
  },
];

const managementAdvantage = [
  {
    title: "Property Management",
    body: "Profiles, pricing, documents, property status and portfolio organization.",
  },
  {
    title: "Tenant Management",
    body: "Tenant records, lease dates, payment status, communication and occupancy.",
  },
  {
    title: "Rent & Collections",
    body: "Payment workflows, reminders, receipts, records and reconciliation.",
  },
  {
    title: "Maintenance Management",
    body: "Requests, approvals, assignment, progress tracking, completion and history.",
  },
  {
    title: "Occupancy Management",
    body: "Occupied/vacant units, upcoming expiries and vacancy visibility.",
  },
  {
    title: "Document Management",
    body: "Leases, property records, inspection information and relevant documents.",
  },
  {
    title: "Services",
    body: "Access to maintenance, cleaning, inspection and other property-support services.",
  },
  {
    title: "Portfolio Intelligence",
    body: "Income, expenses, occupancy, yield indicators and property performance insights.",
  },
];

const flywheel = [
  {
    title: "More Properties",
    body: "More verified supply improves the marketplace.",
  },
  {
    title: "More Users",
    body: "More tenants, landlords and managers increase network usefulness.",
  },
  {
    title: "More Transactions",
    body: "Transactions create recurring engagement and operational activity.",
  },
  {
    title: "More Management",
    body: "Ongoing property management creates deeper relationships and recurring service needs.",
  },
  {
    title: "More Data",
    body: "Aggregated activity improves market and portfolio intelligence.",
  },
  {
    title: "Better Intelligence",
    body: "Better insight can improve pricing, management and investment decisions.",
  },
  {
    title: "Better Experience",
    body: "A stronger experience attracts more participants.",
  },
  {
    title: "Stronger Ecosystem",
    body: "The network becomes harder to replicate as trust, workflows and data compound.",
  },
];

const trustPoints = [
  "User identity verification appropriate to the platform’s operating model.",
  "Property information and listing review processes.",
  "Transparent presentation of applicable charges and terms.",
  "Digital records and auditability for key transactions and property activities.",
  "Clear dispute, support and escalation processes.",
  "Privacy, security and responsible data practices.",
];

const values = [
  {
    title: "Trust",
    body: "We earn confidence through verification, reliability and responsible handling of transactions.",
  },
  {
    title: "Transparency",
    body: "We make property costs, terms and processes easier to understand.",
  },
  {
    title: "Innovation",
    body: "We use technology to solve real property problems and remove avoidable friction.",
  },
  {
    title: "Ownership",
    body: "We put more control, records and decision-making power in the hands of property participants.",
  },
  {
    title: "People First",
    body: "We design for the realities of people navigating property in Nigeria and, ultimately, across Africa.",
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
              Why House In Hands?
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Housing you can trust
            </h1>
            <p className="mt-3 font-display text-xl text-sand/85 sm:text-2xl">
              A property technology company
            </p>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-teal">
              Lagos · Nigeria · Pan-African vision
            </p>
            <p className="mt-8 max-w-2xl text-base leading-relaxed text-sand/70 sm:text-lg">
              A better property system: direct relationships, verified
              participation, transparent processes, digital management and
              connected services.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-sand/65">
              House In Hands (HIH) is being built around a simple idea: property
              should work better for the people who own it, rent it, build it,
              manage it and invest in it.
            </p>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">The Problem</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              The way things are is fragmented
            </h2>
            <div className="mt-6 space-y-5 text-base leading-relaxed text-muted sm:text-lg">
              <p>
                The traditional property journey is fragmented. Tenants can face
                intermediary costs, unclear listings, incomplete information and
                weak support after moving in. Landlords can depend on agents for
                access to tenants, rent collection and basic oversight. Property
                managers can depend on spreadsheets and scattered conversations.
                Developers can struggle to connect inventory, demand and market
                intelligence. Investors often make decisions without consistent,
                structured data.
              </p>
              <p>
                The result is a market where trust is hard to establish,
                transactions can be slow, information is fragmented and property
                management remains unnecessarily manual.
              </p>
              <p>
                House In Hands exists to rebuild that foundation around direct
                access, verification, transparency, digital workflows and useful
                property data.
              </p>
            </div>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Our Answer</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              A trusted property technology ecosystem
            </h2>
            <p className="mt-4 max-w-2xl text-muted leading-relaxed">
              Most property platforms begin and end with listings. HIH is
              designed to connect the property lifecycle — from discovery to
              transaction to ongoing management.
            </p>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {lifecycle.map((item, i) => (
                <li key={item.title} className="border-t border-navy/15 pt-6">
                  <span className="font-mono text-sm text-teal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-navy">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 space-y-14">
            <div>
              <p className="site-kicker">Stakeholders</p>
              <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
                Why it matters
              </h2>
            </div>
            {stakeholderBlocks.map((block) => (
              <div key={block.title} className="border-t border-navy/15 pt-10">
                <h3 className="font-display text-2xl font-semibold text-navy">
                  {block.title}
                </h3>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {block.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3 text-sm leading-relaxed text-navy/80"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="site-section bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              Property Management Advantage
            </p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              A digital property control centre
            </h2>
            <p className="mt-4 max-w-2xl text-sand/70 leading-relaxed">
              The strongest long-term differentiation is not simply listing a
              property. It is helping the owner operate it.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {managementAdvantage.map((item) => (
                <div key={item.title} className="border-t border-white/15 pt-6">
                  <h3 className="font-display text-lg font-semibold text-sand">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-sand/65">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">The Stakeholder Flywheel</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Each layer strengthens the next
            </h2>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {flywheel.map((item, i) => (
                <li key={item.title} className="border-t border-navy/15 pt-6">
                  <span className="font-mono text-sm text-teal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-navy">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {item.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Trust</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Trust is the real product
            </h2>
            <p className="mt-4 text-muted leading-relaxed">
              A listing is only valuable when users can trust the information
              behind it. A payment is only useful when the payer understands who
              is receiving it and how the transaction is handled. A lease is only
              useful when the parties can access and reference it. HIH therefore
              treats trust as a product requirement, not a marketing phrase.
            </p>
            <ul className="mt-8 space-y-3">
              {trustPoints.map((point) => (
                <li
                  key={point}
                  className="flex gap-3 text-sm leading-relaxed text-navy/80"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="site-section bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              Our Five Core Values
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              What we build on
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {values.map((v, i) => (
                <div key={v.title} className="border-t border-white/15 pt-6">
                  <span className="font-mono text-sm text-teal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-sand">
                    {v.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-sand/65">
                    {v.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">What Makes HIH Different</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
              Beyond “find a house”
            </h2>
            <p className="mt-4 text-muted leading-relaxed">
              The strategic difference is the breadth of the system. HIH is
              designed to move beyond “find a house” into “find, rent, manage,
              maintain, pay and understand property.” The long-term opportunity
              is to make House In Hands a trusted digital property layer where
              the marketplace, property operations, financial workflows, services
              and intelligence reinforce one another.
            </p>
          </div>
        </section>

        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
            <p className="site-kicker text-teal">The Bottom Line</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Property, in your hands
            </h2>
            <p className="mt-5 text-sand/70 leading-relaxed">
              House In Hands is being built as a better property system: one
              designed around direct relationships, verification, transparent
              processes, digital property management, connected services and
              actionable intelligence. The ambition is not simply to create
              another app. It is to make property easier to participate in — for
              tenants, landlords, developers, property managers and investors.
            </p>
            <p className="mt-5 font-display text-xl text-sand sm:text-2xl">
              This is housing you can trust. This is property you can manage.
              This is property, in your hands.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/register" className="site-btn site-btn-teal">
                Get started
              </Link>
              <Link href="/how-it-works" className="site-btn site-btn-ghost">
                How it works
              </Link>
            </div>
            <p className="mt-10 text-sm text-sand/50">
              <a
                href="mailto:houseinhandsmail@gmail.com"
                className="text-teal hover:text-teal-light transition-colors"
              >
                houseinhandsmail@gmail.com
              </a>
              {" · "}
              <a
                href="https://www.houseinhands.com"
                className="text-teal hover:text-teal-light transition-colors"
                target="_blank"
                rel="noreferrer"
              >
                www.houseinhands.com
              </a>
              {" · "}
              <a
                href="tel:+2347015079484"
                className="text-teal hover:text-teal-light transition-colors"
              >
                +234 701 507 9484
              </a>
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
