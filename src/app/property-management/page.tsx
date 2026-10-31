import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClosingCta from "@/components/ClosingCta";
import {
  PM_DASHBOARD_MODULES,
  PM_LIFECYCLE,
  PM_MAINTENANCE_STAGES,
  PM_MANAGEMENT_AREAS,
  PM_PROMISE,
  PM_SERVICE_LEVELS,
} from "@/lib/property-management-model";

import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Property Management Nigeria — Estates, Rent & Operations",
  description:
    "Complete property management across Nigeria from one platform — properties, tenants, rent, maintenance, occupancy, documents, services and performance on House In Hands.",
  path: "/property-management",
  keywords: [
    "property management Nigeria",
    "estate management Lagos",
    "property manager Abuja",
  ],
});

export default function PropertyManagementPage() {
  return (
    <div className="site-page">
      <Navbar />
      <main className="pt-28">
        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              Property Management Model
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Complete property management, from one platform
            </h1>
            <p className="mt-3 font-display text-xl text-sand/85 sm:text-2xl">
              Property. In Your Hands.
            </p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-sand/70 sm:text-lg">
              House In Hands gives landlords one digital control centre for
              properties, tenants, rent, maintenance, occupancy, documents,
              services and property performance.
            </p>
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.1em] text-gold">
              Landlord control · Tenant experience · Operational efficiency ·
              Property intelligence
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/register" className="site-btn site-btn-teal">
                Start managing
              </Link>
              <Link href="/how-it-works" className="site-btn site-btn-ghost">
                How it works
              </Link>
            </div>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">What HIH property management means</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              A digital operating system for property owners
            </h2>
            <p className="mt-4 max-w-2xl text-muted leading-relaxed">
              The landlord does not simply list a property; the landlord can
              control the full lifecycle of the asset and the tenant relationship
              from one platform — list → onboard → lease → collect → maintain →
              monitor → analyse → optimise.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {PM_MANAGEMENT_AREAS.map((area) => (
                <div key={area.title} className="border-t border-navy/15 pt-6">
                  <h3 className="font-display text-lg font-semibold text-navy">
                    {area.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {area.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">The landlord dashboard</p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              One control centre
            </h2>
            <p className="mt-4 max-w-2xl text-muted leading-relaxed">
              Designed around one question: “What is happening across my property
              portfolio right now?” Action-oriented — show what needs attention,
              what has changed and what decision is required next.
            </p>
            <div className="mt-12 grid gap-px bg-navy/10 sm:grid-cols-2 lg:grid-cols-4">
              {PM_DASHBOARD_MODULES.map((mod) => (
                <Link
                  key={mod.title}
                  href={mod.href}
                  className="bg-surface p-6 transition-colors hover:bg-sand sm:p-8"
                >
                  <h3 className="font-display text-lg font-semibold text-navy">
                    {mod.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {mod.body}
                  </p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-teal">
                    Open →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="site-section bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              Property lifecycle
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
              From market to optimise
            </h2>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {PM_LIFECYCLE.map((step) => (
                <li key={step.n} className="border-t border-white/15 pt-6">
                  <span className="font-mono text-sm text-teal">{step.n}</span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-sand">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-sand/65">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Maintenance</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              From complaint to completion
            </h2>
            <p className="mt-4 text-muted leading-relaxed">
              Maintenance is where HIH moves beyond a marketplace into a genuine
              property operating platform — with history attached to the asset for
              cost, frequency and provider performance.
            </p>
            <ol className="mt-8 space-y-4">
              {PM_MAINTENANCE_STAGES.map((stage, i) => (
                <li key={stage} className="flex gap-4 text-sm text-navy/80">
                  <span className="font-mono text-teal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{stage}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Service levels</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              Three levels of involvement
            </h2>
            <p className="mt-4 max-w-2xl text-muted leading-relaxed">
              Suitable for a landlord with one property as well as a professional
              portfolio owner — software, assisted support, or fully managed.
            </p>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {PM_SERVICE_LEVELS.map((level) => (
                <div
                  key={level.title}
                  className="border border-navy/10 bg-sand p-6 sm:p-8"
                >
                  <h3 className="font-display text-xl font-semibold text-navy">
                    {level.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {level.body}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.1em] text-teal">
                    Best for · {level.bestFor}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Boundaries</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-navy sm:text-4xl">
              What HIH manages — and what it does not replace
            </h2>
            <p className="mt-4 text-muted leading-relaxed">
              HIH is the digital management and coordination layer. Regulated or
              professional functions remain with qualified and appropriately
              authorised providers where required — including valuation, regulated
              payments/finance, professional legal services, surveying/engineering
              and licensed credit activities.
            </p>
            <p className="mt-8 border-l-2 border-teal pl-5 text-base leading-relaxed text-navy sm:text-lg">
              {PM_PROMISE}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/register" className="site-btn site-btn-teal">
                Create landlord account
              </Link>
              <Link href="/about" className="site-btn site-btn-outline">
                Why House In Hands
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
