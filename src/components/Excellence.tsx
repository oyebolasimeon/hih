"use client";

import AnimatedSection from "./AnimatedSection";

export default function Excellence() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Image side */}
            <div className="order-2 lg:order-1">
              <img
                src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80"
                alt="Professional property management"
                className="w-full h-[300px] sm:h-[400px] lg:h-[500px] object-cover rounded-lg"
              />
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2">
              <p className="text-brand font-medium text-sm uppercase tracking-wider">
                Our Commitment
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                Our Commitment to Excellence
              </h2>
              <div className="mt-5 sm:mt-6 space-y-4 text-muted leading-relaxed text-sm sm:text-base">
                <p>
                  At Nova Elite Homes Ltd, our commitment to excellence is not
                  just a promise; it&apos;s the foundation of everything we do. We
                  believe that exceptional accommodation services require more
                  than just providing a place to stay; they demand attention to
                  detail, genuine care for our clients, and an unwavering
                  dedication to quality.
                </p>
                <p>
                  Our team is highly motivated and brings innovative ideas to
                  every aspect of our service. We continuously seek ways to
                  improve, adapt, and enhance the experience we provide to
                  professionals and students in London.
                </p>
              </div>

              {/* Key points */}
              <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {[
                  "Single point of contact",
                  "Comprehensive support",
                  "Attention to detail",
                  "Lasting relationships",
                ].map((point) => (
                  <div key={point} className="flex items-start gap-2">
                    <svg
                      className="w-5 h-5 text-brand flex-shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-sm font-medium text-foreground">
                      {point}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
