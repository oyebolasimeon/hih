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
                Streamlined home finding services for a stress-free move.
              </h2>
              <div className="mt-5 sm:mt-6 space-y-4 text-muted leading-relaxed text-sm sm:text-base">
                <p>
                  Our journey began as a small company with a simple but powerful
                  idea: to make finding quality accommodation in London easier for
                  professionals and students. What started with just a handful of
                  properties and a determination to do things differently has grown
                  into a thriving service trusted by individuals and businesses
                  across the city.
                </p>
                <p>
                  From the very beginning, her focus has been on more than just
                  providing accommodation. She envisioned creating a service where
                  professionals and students could feel at home, supported, and
                  cared for during their time in London. That same vision still
                  guides us today.
                </p>
                <p>
                  We take pride in looking after every property with care and
                  attention, ensuring our clients feel comfortable and valued. Many
                  of our homes are thoughtfully arranged to bring people together in
                  shared living spaces, while still offering privacy and comfort.
                </p>
              </div>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 mt-6 sm:mt-8 text-brand font-medium hover:text-brand-dark transition-colors text-sm sm:text-base"
              >
                Learn more about our services
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            {/* Image */}
            <div className="relative order-first lg:order-last">
              <img
                src="/mission-building.png"
                alt="Modern London residential development"
                className="w-full h-[300px] sm:h-[400px] lg:h-[520px] object-cover rounded-lg"
              />
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
