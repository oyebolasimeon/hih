import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms & Conditions | House In Hands",
  description:
    "The rules governing your use of House In Hands — Nigeria’s property technology platform.",
};

export default function TermsPage() {
  return (
    <div className="site-page">
      <Navbar />
      <main className="pt-28">
        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              House In Hands · Housing you can trust
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Terms &amp; Conditions
            </h1>
            <p className="mt-3 text-sand/75">
              The rules governing your use of House In Hands
            </p>
            <p className="mt-4 text-sm text-sand/65">
              Last Updated: 30 September 2026
            </p>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8 space-y-12 text-sm leading-relaxed text-navy/80 sm:text-base">
            <div className="border border-navy/10 bg-surface p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold text-navy">
                Please read before using HIH
              </h2>
              <p className="mt-3 text-muted">
                By accessing or using House In Hands, you agree to these Terms.
                If you do not agree, do not use the platform.
              </p>
            </div>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                1. About the Platform
              </h2>
              <p className="mt-4 text-muted">
                House In Hands is a property technology platform operated in
                Nigeria. Depending on the service and availability, HIH may
                support property listings, direct landlord–tenant connections,
                tenancy workflows, rent and utility payments, property
                management, maintenance, occupancy tracking, property services,
                developer/estate tools and property intelligence.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                2. Eligibility &amp; Accounts
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
                <li>
                  You must provide accurate information and be legally capable of
                  entering into the relevant transaction. Most services require
                  users to be 18 or older; any younger-user feature must comply
                  with applicable law and our specific service rules.
                </li>
                <li>
                  KYC or other identity checks may be required. You are
                  responsible for your account credentials and activity and must
                  promptly report suspected unauthorised access.
                </li>
                <li>
                  HIH may restrict or suspend access where there is suspected
                  fraud, misrepresentation, misuse, security risk or
                  legal/regulatory concern.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                3. Property Listings &amp; Landlords
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
                <li>
                  A landlord, owner, developer or manager listing property
                  confirms that they have authority to market or let it and that
                  listing information is accurate to the best of their knowledge.
                </li>
                <li>
                  Listings may be reviewed or verified, but verification is not a
                  guarantee of title, structural condition, valuation, legality
                  or future conduct unless HIH expressly provides that service.
                </li>
                <li>
                  Users must not upload false, misleading, discriminatory or
                  unauthorised property information.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                4. Tenants &amp; Applicants
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
                <li>
                  Applications and profile information must be accurate. Users
                  remain responsible for inspecting a property, reviewing terms
                  and making their own legal/financial decisions.
                </li>
                <li>
                  Tenants must comply with the agreed tenancy terms, applicable
                  house rules, payment obligations and reasonable property-care
                  requirements.
                </li>
                <li>
                  HIH may provide communication, application, document and
                  support tools but is not automatically a party to a tenancy
                  agreement.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                5. Property Management, Maintenance &amp; Services
              </h2>
              <p className="mt-4 text-muted">
                Where available, HIH may provide tools for property records,
                tenant management, rent tracking, occupancy, lease reminders,
                maintenance requests, service-provider coordination, document
                storage and portfolio analytics. Full property-management or
                property-as-a-service engagements may require a separate service
                agreement defining the scope, fees, responsibilities and service
                levels.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                6. Payments, Utilities &amp; Escrow
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
                <li>
                  Payment features are subject to availability, applicable fees,
                  third-party provider rules and verification requirements.
                </li>
                <li>
                  Where HIH facilitates payments, processing/settlement may be
                  performed by appropriately licensed financial or
                  payment-service providers. HIH is not a bank and does not
                  provide regulated financial services except where duly
                  authorised and expressly stated.
                </li>
                <li>
                  Any escrow, custody, installment-finance or similar regulated
                  service will be provided only where legally permitted and,
                  where required, through an appropriately licensed provider.
                  Applicable service-specific terms will govern.
                </li>
                <li>
                  Users should not bypass platform safeguards by sending money to
                  unverified or unauthorised persons. Payment requests outside
                  the official workflow may remove platform protections.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                7. Fees &amp; Refunds
              </h2>
              <p className="mt-4 text-muted">
                Fees, commissions or subscriptions will be disclosed on the
                relevant service or at checkout. Unless a service-specific policy
                states otherwise, fees already incurred for completed services
                are non-refundable. Third-party payment charges may apply. We may
                change pricing prospectively with reasonable notice.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                8. Digital Agreements &amp; Records
              </h2>
              <p className="mt-4 text-muted">
                Where HIH provides electronic tenancy or other documents, the
                parties are responsible for reviewing and approving the terms
                before signing. Electronic execution may be legally effective
                where permitted by applicable law. HIH may retain transaction and
                agreement records for operational, legal and compliance purposes.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                9. Disputes &amp; User Conduct
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
                <li>
                  Users should first attempt good-faith resolution and may use
                  HIH support/dispute channels where available. A separate
                  dispute policy may apply.
                </li>
                <li>
                  HIH may mediate or facilitate communications but is not a court
                  and does not guarantee a particular outcome.
                </li>
                <li>
                  Users must not impersonate others, commit fraud, harass or
                  discriminate, bypass fees or safeguards, hack or
                  reverse-engineer systems, scrape data without permission,
                  upload unlawful content, or misuse another person&apos;s data.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                10. Intellectual Property &amp; User Content
              </h2>
              <p className="mt-4 text-muted">
                HIH owns or licenses the platform, branding, software, designs,
                content and proprietary systems. Users retain ownership of
                content they lawfully own, but grant HIH the limited rights
                reasonably necessary to host, display, process and operate that
                content through the service. No ownership of HIH intellectual
                property is transferred by use of the platform.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                11. Disclaimers &amp; Third-Party Services
              </h2>
              <p className="mt-4 text-muted">
                HIH provides a technology platform and does not guarantee that
                every listing, user, property, service provider or third-party
                service will perform as expected. Third-party payment, identity,
                utility, insurance, mapping, messaging and other services may
                have separate terms and privacy policies. Information and
                analytics on the platform are provided for general decision
                support unless expressly identified as a professional or
                regulated service.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                12. Suspension &amp; Termination
              </h2>
              <p className="mt-4 text-muted">
                We may suspend, restrict or terminate access where reasonably
                necessary for security, fraud prevention, non-compliance, legal
                requirements or protection of users or the platform. Users may
                stop using the service at any time, subject to any outstanding
                contractual obligations and applicable retention requirements.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                13. Limitation of Liability
              </h2>
              <p className="mt-4 text-muted">
                To the maximum extent permitted by law, HIH is not liable for
                indirect, consequential or unforeseeable loss arising from
                user-to-user transactions, property condition, third-party
                services, connectivity, or events outside our reasonable control.
                Nothing in these Terms excludes liability that cannot lawfully be
                excluded. Any contractual liability cap will apply only to the
                extent permitted by applicable law and any specific service
                agreement.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                14. Indemnity
              </h2>
              <p className="mt-4 text-muted">
                To the extent permitted by law, a user who causes loss, claim,
                penalty or expense through fraud, unlawful conduct, infringement,
                misuse of the platform or breach of these Terms agrees to
                indemnify HIH against the resulting reasonable costs and
                liabilities.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                15. Privacy
              </h2>
              <p className="mt-4 text-muted">
                Your use of personal data is governed by the House In Hands{" "}
                <Link
                  href="/legal/privacy"
                  className="font-semibold text-teal-dark hover:underline"
                >
                  Privacy Policy
                </Link>
                , as updated from time to time, which forms part of these Terms.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                16. Changes, Governing Law &amp; Contact
              </h2>
              <p className="mt-4 text-muted">
                We may update these Terms when our services, law or risk
                environment changes. Material changes will be communicated
                through appropriate channels. These Terms are governed by the
                laws of the Federal Republic of Nigeria. The parties submit to
                courts of competent jurisdiction in Nigeria, unless a written
                service-specific agreement provides a lawful alternative dispute
                mechanism.
              </p>
              <p className="mt-4 text-muted">
                House In Hands | Lagos, Nigeria |{" "}
                <a
                  href="mailto:noreply@houseinhands.com"
                  className="font-semibold text-teal-dark hover:underline"
                >
                  noreply@houseinhands.com
                </a>{" "}
                |{" "}
                <a
                  href="tel:+2347015079484"
                  className="font-semibold text-teal-dark hover:underline"
                >
                  +234 701 507 9484
                </a>{" "}
                |{" "}
                <a
                  href="https://www.houseinhands.com"
                  className="font-semibold text-teal-dark hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  www.houseinhands.com
                </a>
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
