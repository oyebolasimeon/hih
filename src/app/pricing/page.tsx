import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClosingCta from "@/components/ClosingCta";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  HOW_PRICING_WORKS,
  PRICING_EXAMPLE,
  PRICING_HERO,
  PRICING_LANDLORD_SOFTWARE,
  PRICING_MANAGEMENT_TIERS,
  PRICING_NOTES,
  PRICING_TENANT,
} from "@/lib/pricing-content";
import { DEFAULT_PLATFORM_FEES } from "@/lib/platform-fees";

export const metadata: Metadata = buildPageMetadata({
  title: "Pricing — Clear Property Fees in Nigeria",
  description:
    "House In Hands pricing: free tenant search, transparent agreement fees, and landlord management levels from self-serve to fully managed — no traditional agent commission surprises.",
  path: "/pricing",
  keywords: [
    "House In Hands pricing",
    "rent without agent commission Nigeria",
    "property management fees Nigeria",
  ],
});

export default function PricingPage() {
  return (
    <div className="site-page">
      <Navbar />
      <main className="pt-28">
        <section className="relative overflow-hidden bg-navy text-sand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/renting-stress-campaign.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/70" />
          <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-28">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              {PRICING_HERO.kicker}
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {PRICING_HERO.title}
            </h1>
            <p className="mt-5 max-w-2xl text-sand/75 text-lg leading-relaxed">
              {PRICING_HERO.body}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="site-btn site-btn-teal">
                Get started free
              </Link>
              <Link href="/contact" className="site-btn site-btn-ghost">
                Talk to sales
              </Link>
            </div>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">At a glance</p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-navy sm:text-4xl">
              Who pays what
            </h2>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <article className="border border-navy/10 bg-surface p-6 sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
                  Tenants
                </p>
                <h3 className="mt-3 font-display text-2xl font-semibold text-navy">
                  {PRICING_TENANT.title}
                </h3>
                <p className="mt-2 font-display text-3xl font-semibold text-teal-dark">
                  {PRICING_TENANT.priceLabel}
                </p>
                <ul className="mt-6 space-y-3">
                  {PRICING_TENANT.points.map((p) => (
                    <li
                      key={p}
                      className="border-t border-navy/10 pt-3 text-sm leading-relaxed text-muted"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </article>

              <article className="border border-navy/10 bg-navy p-6 text-sand sm:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
                  Landlords
                </p>
                <h3 className="mt-3 font-display text-2xl font-semibold">
                  {PRICING_LANDLORD_SOFTWARE.title}
                </h3>
                <p className="mt-2 font-display text-3xl font-semibold text-gold">
                  {PRICING_LANDLORD_SOFTWARE.priceLabel}
                </p>
                <ul className="mt-6 space-y-3">
                  {PRICING_LANDLORD_SOFTWARE.points.map((p) => (
                    <li
                      key={p}
                      className="border-t border-white/10 pt-3 text-sm leading-relaxed text-sand/70"
                    >
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="border border-navy/10 bg-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Agreement fee (HIH legal)
                </p>
                <p className="mt-2 font-display text-3xl font-semibold text-navy">
                  {DEFAULT_PLATFORM_FEES.agreementFeePercent}%
                </p>
                <p className="mt-2 text-xs text-muted">of annual rent · default</p>
              </div>
              <div className="border border-navy/10 bg-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Platform fee (own legal)
                </p>
                <p className="mt-2 font-display text-3xl font-semibold text-navy">
                  from {DEFAULT_PLATFORM_FEES.platformFeeMinPercent}%
                </p>
                <p className="mt-2 text-xs text-muted">shown at checkout</p>
              </div>
              <div className="border border-navy/10 bg-surface p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Agent commission
                </p>
                <p className="mt-2 font-display text-3xl font-semibold text-navy">
                  ₦0
                </p>
                <p className="mt-2 text-xs text-muted">
                  on the direct rental workflow
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">How pricing works</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold text-navy sm:text-4xl">
              Simple path from free search to paid services
            </h2>
            <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_PRICING_WORKS.map((step) => (
                <li key={step.n} className="border-t border-navy/15 pt-6">
                  <span className="font-mono text-sm text-teal">{step.n}</span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-navy">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
            <p className="mt-10 max-w-3xl border-l-2 border-teal pl-5 text-sm leading-relaxed text-muted sm:text-base">
              <span className="font-semibold text-navy">{PRICING_EXAMPLE.title}.</span>{" "}
              {PRICING_EXAMPLE.body}
            </p>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Property management</p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold text-navy sm:text-4xl">
              Three levels — pick what fits your portfolio
            </h2>
            <p className="mt-4 max-w-2xl text-muted">
              From the House In Hands Property Management Model: monetize with
              software subscriptions, service fees or full management packages —
              without forcing every landlord into the same model.
            </p>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {PRICING_MANAGEMENT_TIERS.map((tier) => (
                <article
                  key={tier.title}
                  className="flex flex-col border border-navy/10 bg-surface p-6 sm:p-7"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
                    {tier.badge}
                  </p>
                  <h3 className="mt-3 font-display text-2xl font-semibold text-navy">
                    {tier.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {tier.body}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-navy/50">
                    Best for
                  </p>
                  <p className="mt-1 text-sm font-medium text-navy">
                    {tier.bestFor}
                  </p>
                  <ul className="mt-6 flex-1 space-y-2 border-t border-navy/10 pt-5">
                    {tier.highlights.map((h) => (
                      <li key={h} className="text-sm text-muted">
                        {h}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/contact"
                    className="mt-6 inline-flex text-sm font-semibold text-teal-dark hover:text-teal"
                  >
                    Request this level →
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-surface py-12">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <h2 className="font-display text-xl font-semibold text-navy">
              Good to know
            </h2>
            <ul className="mt-5 space-y-3">
              {PRICING_NOTES.map((n) => (
                <li key={n} className="text-sm leading-relaxed text-muted">
                  {n}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="site-btn site-btn-teal">
                Create account
              </Link>
              <Link href="/property-management" className="site-btn site-btn-outline">
                Property management model
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
