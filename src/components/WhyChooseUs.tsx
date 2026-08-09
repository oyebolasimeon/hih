"use client";

import AnimatedSection from "./AnimatedSection";

const features = [
  {
    title: "Tailored Services",
    description:
      "We understand that every client's needs are unique. Whether you're a student looking for a comfortable place near your university or a company seeking accommodation for staff, we adapt our services to suit you.",
  },
  {
    title: "Prime London Locations",
    description:
      "Our growing selection of properties is located across London, giving you access to well connected, convenient, and safe areas of the city.",
  },
  {
    title: "Shared Living with Comfort",
    description:
      "Our properties are designed to provide a balance between community and privacy, giving clients the chance to enjoy affordable, practical accommodation while still feeling at home.",
  },
  {
    title: "Quality and Care",
    description:
      "We treat every property as if it were our own. From upkeep to comfort, we make sure each space is ready for you to feel at home from the moment you move in.",
  },
  {
    title: "Professional Support",
    description:
      "Our friendly and experienced team is always on hand to assist you before, during, and after your stay. We believe in building lasting relationships, not just short-term bookings.",
  },
  {
    title: "Flexible Options",
    description:
      "Whether you need short-term or long-term accommodation, we provide flexible arrangements to match your schedule and requirements.",
  },
];

export default function WhyChooseUs() {
  return (
    <section id="why-us" className="py-16 sm:py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Left column - heading & image */}
          <div className="lg:col-span-5">
            <AnimatedSection>
              <p className="text-brand font-medium text-sm uppercase tracking-wider">
                Why Choose Us
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                Why choose our relocation services
              </h2>
              <p className="mt-4 text-muted leading-relaxed text-sm sm:text-base">
                Choosing where to stay in London can be overwhelming, but with
                Nova Elite Homes Ltd, you can be confident that your
                accommodation needs are in safe hands.
              </p>
              <img
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80"
                alt="Luxury living room interior"
                className="mt-6 sm:mt-8 w-full h-48 sm:h-72 object-cover rounded-lg"
              />
            </AnimatedSection>
          </div>

          {/* Right column - features list */}
          <div className="lg:col-span-7">
            <div className="space-y-0 divide-y divide-border">
              {features.map((feature, index) => (
                <AnimatedSection key={feature.title} delay={index * 0.08}>
                  <div className="py-5 sm:py-6 first:pt-0 group">
                    <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-brand transition-colors">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 sm:mt-2 text-muted text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </div>

            <AnimatedSection delay={0.5}>
              <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-brand-subtle border border-brand/10 rounded-lg">
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="font-semibold">Trusted by Businesses and Individuals</span>{" "}
                  — Companies rely on us to house their staff, and individuals
                  trust us with one of their most important needs: a home while in
                  London. With Nova Elite Homes Ltd, accommodation isn&apos;t just
                  about a place to stay. It&apos;s about peace of mind, reliability,
                  and a service you can count on.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
