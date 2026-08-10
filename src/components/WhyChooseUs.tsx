"use client";

import AnimatedSection from "./AnimatedSection";

const features = [
  {
    title: "Profiles that fit you",
    description:
      "Use House In Hand as a student, tenant, landlord, or estate manager — switch profiles without creating new accounts.",
  },
  {
    title: "Verified listings",
    description:
      "Search homes and hostels with clearer details and verification checkpoints before a listing goes live.",
  },
  {
    title: "Safer applications",
    description:
      "Apply or review applications in-app instead of relying only on informal chats and cash deposits.",
  },
  {
    title: "Digital agreements",
    description:
      "Keep tenancy terms in one place so both sides can review and sign without losing documents.",
  },
  {
    title: "Rent & payments",
    description:
      "Track rent and related payments with a history you can return to when questions come up.",
  },
  {
    title: "Built for Nigeria",
    description:
      "Designed for how housing works here — estates, student hostels, landlords, and city mobility.",
  },
];

export default function WhyChooseUs() {
  return (
    <section id="why-us" className="py-16 sm:py-24 bg-surface">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-5">
            <AnimatedSection>
              <p className="text-brand font-medium text-sm uppercase tracking-wider">
                Why Choose Us
              </p>
              <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground leading-tight">
                Why house hunters and landlords choose House In Hand
              </h2>
              <p className="mt-4 text-muted leading-relaxed text-sm sm:text-base">
                Finding or letting a home should not mean gambling on unverified
                contacts. We connect search, KYC, listings, and tenancy tools in
                one platform.
              </p>
              <img
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80"
                alt="Comfortable living space"
                className="mt-6 sm:mt-8 w-full h-48 sm:h-72 object-cover rounded-lg"
              />
            </AnimatedSection>
          </div>

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
                  <span className="font-semibold">One platform, clearer housing</span>{" "}
                  — whether you are searching near campus or managing units
                  across an estate, House In Hand keeps the process organised
                  from first enquiry to active tenancy.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </div>
    </section>
  );
}
