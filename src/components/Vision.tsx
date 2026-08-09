"use client";

import AnimatedSection from "./AnimatedSection";

export default function Vision() {
  return (
    <section id="vision" className="py-16 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <AnimatedSection>
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-brand font-medium text-sm uppercase tracking-wider">
              Our Vision
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
              The trusted choice for accommodation in London
            </h2>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-muted leading-relaxed">
              Our vision is to be the trusted choice for accommodation in London,
              offering living spaces that allow individuals and teams to thrive
              while carrying forward the determination, passion, and excellence on
              which Nova Elite Homes Ltd was built.
            </p>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <div className="mt-12 sm:mt-16 grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-0 sm:border sm:border-border sm:rounded-lg sm:overflow-hidden">
            {[
              {
                image:
                  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
                title: "Quality Living Spaces",
                description:
                  "Thoughtfully designed environments that balance community with privacy, making London feel like home.",
              },
              {
                image:
                  "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?w=600&q=80",
                title: "Professional Community",
                description:
                  "Creating environments where professionals and students can thrive, connect, and succeed together.",
              },
              {
                image:
                  "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=600&q=80",
                title: "Excellence in Everything",
                description:
                  "Unwavering dedication to the highest standards, from property maintenance to client relationships.",
              },
            ].map((item, index) => (
              <div
                key={item.title}
                className={`group border border-border sm:border-0 rounded-lg sm:rounded-none overflow-hidden ${
                  index < 2 ? "sm:border-r sm:border-border" : ""
                }`}
              >
                <div className="overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-48 sm:h-56 object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6 sm:p-8">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 sm:mt-3 text-muted text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
