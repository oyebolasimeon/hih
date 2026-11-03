"use client";

import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import SocialLinks from "@/components/seo/SocialLinks";

export default function Footer() {
  return (
    <footer className="bg-navy-deep text-sand">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <BrandMark invert href="/" showLabel />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-sand/60">
              Housing you can trust. Property technology that connects people,
              properties, payments, services and intelligence in one ecosystem.
            </p>
            <p className="mt-6 space-y-1 text-sm text-sand/45">
              <a
                href="mailto:noreply@houseinhands.com"
                className="block text-teal hover:text-teal-light transition-colors"
              >
                noreply@houseinhands.com
              </a>
              <a
                href="https://www.houseinhands.com"
                className="block text-teal hover:text-teal-light transition-colors"
                target="_blank"
                rel="noreferrer"
              >
                www.houseinhands.com
              </a>
              <a
                href="tel:+2347015079484"
                className="block text-teal hover:text-teal-light transition-colors"
              >
                +234 701 507 9484
              </a>
            </p>
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sand/40">
                Follow us
              </p>
              <SocialLinks invert className="mt-3" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-sand/40">
                Explore
              </h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "House hunting", href: "/house-hunting" },
                  { label: "How it works", href: "/how-it-works" },
                  {
                    label: "Property management",
                    href: "/property-management",
                  },
                  { label: "Listings", href: "/listings" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Stories", href: "/blog" },
                  { label: "RSS feed", href: "/feed.xml" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-sand/70 hover:text-sand transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-sand/40">
                Company
              </h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "About", href: "/about" },
                  { label: "Waitlist", href: "/waitlist" },
                  { label: "Contact", href: "/contact" },
                  { label: "FAQ", href: "/faq" },
                ].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-sand/70 hover:text-sand transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-sand/40">
                Legal
              </h4>
              <ul className="mt-4 space-y-2.5">
                <li>
                  <Link
                    href="/legal/privacy"
                    className="text-sm text-sand/70 hover:text-sand transition-colors"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/legal/terms"
                    className="text-sm text-sand/70 hover:text-sand transition-colors"
                  >
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-sand/40">
            © {new Date().getFullYear()} House In Hands. All rights reserved.
          </p>
          <p className="text-xs text-sand/35">
            Property. In Your Hands.
          </p>
        </div>
      </div>
    </footer>
  );
}
