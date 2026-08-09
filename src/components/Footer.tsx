"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-foreground text-white">
      {/* Next Steps CTA */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-brand-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <span className="text-lg sm:text-xl font-semibold">Next steps</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
              <a
                href="tel:03302296964"
                className="px-6 sm:px-8 py-3 border border-white/30 text-white text-sm font-medium rounded-md hover:bg-white hover:text-foreground transition-all text-center"
              >
                Call 0330 229 6964
              </a>
              <Link
                href="#contact"
                className="px-6 sm:px-8 py-3 border border-white/30 text-white text-sm font-medium rounded-md hover:bg-white hover:text-foreground transition-all text-center"
              >
                Contact the team
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">
          {/* About */}
          <div className="col-span-2 sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <img
                src="/logo.png"
                alt="Nova Elite Homes"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-md object-contain"
              />
              <span className="font-semibold text-white text-sm sm:text-base">Nova Elite Homes</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              Premium accommodation services for working professionals and
              students in London.
            </p>
            {/* Social links */}
            <div className="flex items-center gap-3 mt-4 sm:mt-6">
              <span className="text-xs sm:text-sm text-white/40">Follow us on</span>
              <a
                href="https://instagram.com/novaelitehomes"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center hover:border-brand hover:text-brand transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">
              About
            </h4>
            <ul className="space-y-2 sm:space-y-3">
              {[
                { label: "About Us", href: "#about" },
                { label: "Our Mission", href: "#mission" },
                { label: "Our Vision", href: "#vision" },
                { label: "Why Choose Us", href: "#why-us" },
                { label: "Contact", href: "#contact" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">
              Services
            </h4>
            <ul className="space-y-2 sm:space-y-3">
              {[
                "Professional Housing",
                "Student Accommodation",
                "Corporate Lettings",
                "Short-term Stays",
                "Long-term Rentals",
              ].map((item) => (
                <li key={item}>
                  <span className="text-xs sm:text-sm text-white/60">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Governance */}
          <div>
            <h4 className="text-xs sm:text-sm font-semibold text-white uppercase tracking-wider mb-3 sm:mb-4">
              Governance
            </h4>
            <ul className="space-y-2 sm:space-y-3">
              <li>
                <Link href="#" className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <span className="text-xs sm:text-sm text-white/60">
                  Company No: 15729312
                </span>
              </li>
              <li>
                <span className="text-xs sm:text-sm text-white/60">
                  Property Redress Scheme Member
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex flex-col items-center text-center space-y-6">
            <h3 className="text-lg sm:text-xl font-semibold text-brand">
              Nova Elite Homes
            </h3>
            <p className="text-xs sm:text-sm text-white/50">
              &copy; 2025 Nova Elite Homes. All rights reserved.
            </p>

            <div className="w-12 h-0.5 bg-brand/40 rounded-full" />

            <div className="flex items-center gap-6 sm:gap-8">
              <Link href="#" className="text-sm text-white/60 hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="text-sm text-white/60 hover:text-white transition-colors">
                Terms of Service
              </Link>
            </div>

            <div className="w-full max-w-xs h-px bg-white/10 my-2" />

            <div className="flex flex-col items-center gap-3">
              <span className="text-xs uppercase tracking-wider text-white/40">
                A Member Of
              </span>
              <img
                src="/property-redress.png"
                alt="Property Redress Scheme Member"
                className="h-12 sm:h-14 object-contain rounded-md"
              />
            </div>

            <div className="w-full max-w-xs h-px bg-white/10 my-2" />

            <p className="text-xs sm:text-sm text-white/40">
              Company House Number: 15729312
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
