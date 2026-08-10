"use client";

import AnimatedSection from "./AnimatedSection";

export default function About() {
  return (
    <section id="about" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Image */}
            <div className="relative">
              <img
                src="/team-director.png"
                alt="House In Hand team"
                className="w-full h-[300px] sm:h-[400px] lg:h-[480px] object-cover rounded-lg"
              />
              <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 bg-foreground text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg hidden sm:block">
                <p className="text-xl sm:text-2xl font-bold text-brand">One</p>
                <p className="text-xs sm:text-sm text-white/80">Housing platform</p>
              </div>
            </div>

            {/* Content */}
            <div>
              <p className="text-brand font-medium text-sm uppercase tracking-wider">
                About Us
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                Housing, search to tenancy — in one place
              </h2>
              <div className="mt-5 sm:mt-6 space-y-4 text-muted leading-relaxed text-sm sm:text-base">
                <p>
                  House In Hand is a property rental platform for Nigeria. We
                  help students, tenants, landlords, and estate managers find
                  homes, list properties, complete KYC, and manage agreements
                  and rent without juggling chats, cash, and paperwork.
                </p>
                <p>
                  From verified listings to digital workflows, we focus on trust,
                  clarity, and tools that make housing simpler whether you are
                  searching near campus or managing an estate.
                </p>
              </div>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">KYC-verified profiles</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">Verified listings</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">Built for Nigeria</span>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
