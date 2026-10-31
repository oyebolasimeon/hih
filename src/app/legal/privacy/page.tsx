import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | House In Hands",
  description:
    "How House In Hands collects, uses, shares and protects personal data under the Nigeria Data Protection Act 2023.",
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-4 text-sm text-sand/65">
              Last Updated: 30 September 2026
            </p>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8 space-y-12 text-sm leading-relaxed text-navy/80 sm:text-base">
            <div className="border border-navy/10 bg-surface p-6 sm:p-8">
              <h2 className="font-display text-xl font-semibold text-navy">
                At a glance
              </h2>
              <p className="mt-3 text-muted">
                This Policy applies to our website, mobile application and
                related property, payment, management, service and data
                features. It should be read together with our{" "}
                <Link
                  href="/legal/terms"
                  className="font-semibold text-teal-dark hover:underline"
                >
                  Terms &amp; Conditions
                </Link>{" "}
                and any product-specific notices.
              </p>
            </div>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                1. Who We Are
              </h2>
              <p className="mt-4 text-muted">
                House In Hands (“HIH”, “we”, “us”, “our”) is a Nigerian property
                technology platform connecting people, properties, payments,
                property operations and property intelligence.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                2. Information We Collect
              </h2>

              <h3 className="mt-6 font-display text-lg font-semibold text-navy">
                2.1 Information you provide
              </h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-muted">
                <li>
                  <span className="font-medium text-navy">
                    Identity and contact details:
                  </span>{" "}
                  name, email, phone number, address and account information.
                </li>
                <li>
                  <span className="font-medium text-navy">KYC information:</span>{" "}
                  NIN and related verification information where required for a
                  service.
                </li>
                <li>
                  <span className="font-medium text-navy">
                    Property information:
                  </span>{" "}
                  property details, photos, location, ownership/authority
                  documents, pricing, availability and service charges.
                </li>
                <li>
                  <span className="font-medium text-navy">
                    Transaction information:
                  </span>{" "}
                  rent, fees, utility/service payments, receipts and settlement
                  information. Payment credentials are handled by relevant
                  payment providers.
                </li>
                <li>
                  <span className="font-medium text-navy">
                    Communications and documents:
                  </span>{" "}
                  messages, tenancy agreements, maintenance requests, support
                  tickets and uploaded records.
                </li>
              </ul>

              <h3 className="mt-6 font-display text-lg font-semibold text-navy">
                2.2 Information collected automatically
              </h3>
              <p className="mt-3 text-muted">
                Device/browser information, IP address and approximate location;
                usage, log and security information; cookies and similar
                technologies.
              </p>

              <h3 className="mt-6 font-display text-lg font-semibold text-navy">
                2.3 Information from third parties
              </h3>
              <p className="mt-3 text-muted">
                Identity-verification providers, payment providers,
                utility/service providers, insurance partners where applicable,
                fraud-prevention partners and other service providers used to
                deliver the requested service.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                3. How We Use Information
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
                <li>
                  Create and secure accounts and verify identity; publish and
                  manage property listings; connect landlords, tenants,
                  developers, property managers and service providers.
                </li>
                <li>
                  Facilitate tenancy workflows, payments, property management,
                  maintenance, occupancy tracking, service requests and digital
                  records, where available.
                </li>
                <li>
                  Communicate reminders, updates, support responses and service
                  notices; resolve disputes and investigate suspected fraud or
                  misuse.
                </li>
                <li>
                  Improve, secure and develop the platform, including analytics,
                  service measurement and, where introduced, AI-assisted or
                  automated features.
                </li>
                <li>
                  Meet applicable legal, regulatory, accounting, security and
                  compliance obligations; send marketing where permitted and
                  where consent or another lawful basis is required.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                4. Lawful Bases
              </h2>
              <p className="mt-4 text-muted">
                We process personal data on one or more lawful bases available
                under the Nigeria Data Protection Act 2023, including
                performance of a contract, compliance with a legal obligation,
                consent, protection of vital interests and legitimate interests
                where applicable and balanced against your rights. We collect
                only data reasonably necessary for the relevant purpose.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                5. Sharing &amp; Service Providers
              </h2>
              <p className="mt-4 text-muted">
                We do not sell personal data. We may share information with
                parties needed to provide, secure or regulate the service,
                including identity/KYC providers, payment processors, cloud and
                infrastructure providers, communications tools, utility/service
                partners, professional advisers and competent authorities where
                lawfully required.
              </p>
              <p className="mt-4 text-muted">
                Where another organisation processes information on our behalf,
                we require appropriate contractual and security controls. Where
                data is transferred outside Nigeria, we use the safeguards
                required by applicable data-protection law.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                6. Security &amp; Data Breach
              </h2>
              <p className="mt-4 text-muted">
                We use reasonable technical and organisational measures such as
                access controls, encryption where appropriate, logging, secure
                development practices and administrative controls. No system can
                be guaranteed to be completely secure.
              </p>
              <p className="mt-4 text-muted">
                Where a personal-data breach triggers notification duties under
                applicable law, HIH will notify the Nigeria Data Protection
                Commission and affected data subjects as required.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                7. Retention
              </h2>
              <p className="mt-4 text-muted">
                We retain information only for as long as reasonably necessary
                for the purpose collected, to provide services, meet
                legal/regulatory obligations, resolve disputes, maintain records
                and protect legitimate interests. Different records may have
                different retention periods.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                8. Your Rights
              </h2>
              <ul className="mt-4 list-disc space-y-2 pl-5 text-muted">
                <li>
                  Right to be informed, access, rectification, erasure,
                  restriction and objection, and data portability where
                  applicable.
                </li>
                <li>
                  Right to withdraw consent where processing relies on consent,
                  without affecting processing already lawfully carried out.
                </li>
                <li>
                  Right to lodge a complaint with the Nigeria Data Protection
                  Commission where you believe your rights have been infringed.
                </li>
                <li>
                  Requests should be sent to{" "}
                  <a
                    href="mailto:houseinhandsmail@gmail.com"
                    className="font-semibold text-teal-dark hover:underline"
                  >
                    houseinhandsmail@gmail.com
                  </a>
                  . We may need to verify your identity before acting on a
                  request.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                9. Cookies &amp; Marketing
              </h2>
              <p className="mt-4 text-muted">
                We use cookies and similar technologies for essential
                functionality, preferences, security and analytics. Where
                required, we will request consent for non-essential cookies.
                Marketing communications may be opted out of at any time.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                10. Automated Decision-Making
              </h2>
              <p className="mt-4 text-muted">
                We may use automated tools for fraud detection, verification,
                recommendations, analytics or other platform functions. Where
                applicable law gives you rights regarding decisions made solely
                by automated means, HIH will provide the required notice and
                mechanism to exercise those rights.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-navy">
                11. Changes &amp; Contact
              </h2>
              <p className="mt-4 text-muted">
                We may update this Policy when our services, law or security
                practices change. Material changes will be communicated through
                the platform, email or other appropriate means.
              </p>
              <p className="mt-4 text-muted">
                Questions and privacy requests:{" "}
                <a
                  href="mailto:houseinhandsmail@gmail.com"
                  className="font-semibold text-teal-dark hover:underline"
                >
                  houseinhandsmail@gmail.com
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
