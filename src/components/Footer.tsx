"use client";

import Link from "next/link";
import BrandMark from "@/components/BrandMark";

export default function Footer() {
  return (
    <footer className="bg-navy-deep text-sand">
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <BrandMark invert href="/" showLabel />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-sand/60">
              Property rental and housing management for Nigeria — search, list,
              apply, sign, and pay rent with trust at the centre.
            </p>
            <p className="mt-6 text-sm text-sand/45">
              Lagos · Abuja · Nationwide
              <br />
              <a
                href="mailto:hello@houseinhand.com"
                className="text-teal hover:text-teal-light transition-colors"
              >
                hello@houseinhand.com
              </a>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-sand/40">
                Explore
              </h4>
              <ul className="mt-4 space-y-2.5">
                {[
                  { label: "How it works", href: "/how-it-works" },
                  { label: "Listings", href: "/listings" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Stories", href: "/blog" },
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
            © {new Date().getFullYear()} House In Hand. All rights reserved.
          </p>
          <p className="text-xs text-sand/35">
            Navy · Teal · Sand — trust, proptech, home.
          </p>
        </div>
      </div>
    </footer>
  );
}
