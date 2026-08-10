"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-foreground text-white">
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="text-lg sm:text-xl font-semibold">Ready to get started?</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <Link
                href="/register"
                className="px-6 sm:px-8 py-3 bg-brand text-foreground text-sm font-semibold rounded-md hover:bg-brand-dark transition-all text-center"
              >
                Create an account
              </Link>
              <Link
                href="/contact"
                className="px-6 sm:px-8 py-3 border border-white/30 text-white text-sm font-medium rounded-md hover:bg-white hover:text-foreground transition-all text-center"
              >
                Contact the team
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="House In Hand"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-md object-contain"
              />
              <span className="font-semibold text-white text-sm sm:text-base">House In Hand</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Property rental and housing management for Nigeria — search, list,
              apply, pay, and manage agreements in one place.
            </p>
            <div className="mt-4 sm:mt-6 space-y-1 text-xs sm:text-sm text-white/50">
              <p>Lagos · Abuja · Nationwide</p>
              <a href="mailto:hello@houseinhand.com" className="hover:text-white transition-colors">
                hello@houseinhand.com
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">
              Explore
            </h4>
            <ul className="space-y-2 sm:space-y-3">
              {[
                { label: "How it works", href: "/how-it-works" },
                { label: "Listings", href: "/listings" },
                { label: "Blog", href: "/blog" },
                { label: "FAQ", href: "/faq" },
                { label: "About", href: "/about" },
                { label: "Contact", href: "/contact" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">
              For you
            </h4>
            <ul className="space-y-2 sm:space-y-3">
              {[
                "Students",
                "Tenants",
                "Landlords",
                "Estate managers",
              ].map((item) => (
                <li key={item}>
                  <span className="text-xs sm:text-sm text-white/60">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">
              Legal
            </h4>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="/legal/privacy" className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p className="text-xs sm:text-sm text-white/50">
              &copy; 2026 House In Hand. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/legal/privacy" className="text-sm text-white/60 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="/legal/terms" className="text-sm text-white/60 hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
