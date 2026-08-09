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
                alt="Nova Elite Homes Director"
                className="w-full h-[300px] sm:h-[400px] lg:h-[480px] object-cover rounded-lg"
              />
              <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 bg-foreground text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-lg hidden sm:block">
                <p className="text-xl sm:text-2xl font-bold text-brand">5+</p>
                <p className="text-xs sm:text-sm text-white/80">Years of Excellence</p>
              </div>
            </div>

            {/* Content */}
            <div>
              <p className="text-brand font-medium text-sm uppercase tracking-wider">
                About Us
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                Premium Accommodation Services in London
              </h2>
              <div className="mt-5 sm:mt-6 space-y-4 text-muted leading-relaxed text-sm sm:text-base">
                <p>
                  At Nova Elite Homes Ltd, we specialise in providing comfortable
                  and convenient accommodation services for working professionals
                  and students in London. Whether you are relocating for a
                  project, moving for studies, on a short-term assignment, or
                  simply need a place to stay while in the city, we make the
                  process seamless.
                </p>
                <p>
                  Our director built Nova Elite Homes Ltd from the ground up.
                  Having worked for years in property administration, she gained
                  extensive experience in managing homes, coordinating with
                  clients, and understanding exactly what people need when
                  relocating or working in a busy city like London. With that
                  expertise, she transformed her knowledge and passion into a
                  business dedicated to providing excellent living spaces and
                  outstanding service.
                </p>
              </div>
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">Professional Service</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">Quality Properties</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-brand-subtle flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-foreground">Trusted by Businesses</span>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
