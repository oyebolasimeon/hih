"use client";

import AnimatedSection from "./AnimatedSection";

export default function Mission() {
  return (
    <section id="mission" className="py-16 sm:py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Content */}
            <div>
              <p className="text-brand font-medium text-sm uppercase tracking-wider">
                Our Mission
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                Make finding and managing a home simple and trustworthy.
              </h2>
              <div className="mt-5 sm:mt-6 space-y-4 text-muted leading-relaxed text-sm sm:text-base">
                <p>
                  Our mission is to remove the friction from Nigeria&apos;s rental
                  market — scattered listings, unverified agents, and handshake
                  deals that leave everyone exposed.
                </p>
                <p>
                  We bring students, tenants, landlords, and estate managers onto
                  one platform with profiles, KYC, verified listings, applications,
                  payments, and agreements.
                </p>
                <p>
                  Every feature we ship aims for clarity and trust: so moving in,
                  collecting rent, or managing an estate feels organised — not
                  stressful.
                </p>
              </div>
              <a
                href="/how-it-works"
                className="inline-flex items-center gap-2 mt-6 sm:mt-8 text-brand font-medium hover:text-brand-dark transition-colors text-sm sm:text-base"
              >
                See how it works
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* Image */}
            <div className="relative order-first lg:order-last">
              <img
                src="/mission-building.png"
                alt="Residential housing"
                className="w-full h-[300px] sm:h-[400px] lg:h-[520px] object-cover rounded-lg"
              />
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
