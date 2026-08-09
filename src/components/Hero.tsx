"use client";

import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative">
      {/* Hero Image Banner */}
      <div className="relative h-[100svh] min-h-[500px] sm:min-h-[600px] sm:h-[85vh] overflow-hidden">
        <img
          src="/hero-london.png"
          alt="Canary Wharf skyline, London"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/70 via-black/50 to-black/20 sm:to-transparent" />

        <div className="relative h-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex items-end sm:items-center pb-24 sm:pb-0 pt-20">
          <div className="max-w-2xl">
            <h1 className="font-[var(--font-serif)] text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Find Your Dream Home in London
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-white/85 leading-relaxed max-w-xl">
              Discover your perfect property with our expert guidance. Premium
              accommodation services for professionals and students across
              London.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Link
                href="#contact"
                className="inline-flex items-center justify-center px-6 sm:px-7 py-3 sm:py-3.5 bg-brand text-foreground font-semibold rounded-md hover:bg-brand-dark transition-colors text-sm sm:text-base"
              >
                Get In Touch
              </Link>
              <Link
                href="#about"
                className="inline-flex items-center justify-center px-6 sm:px-7 py-3 sm:py-3.5 bg-white text-foreground font-medium rounded-md hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {[
              { value: "100+", label: "Properties Managed" },
              { value: "500+", label: "Happy Clients" },
              { value: "5+", label: "Years Experience" },
              { value: "London", label: "Prime Locations" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-brand-dark">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-muted mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
