"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import InvestorLoginModal from "@/components/InvestorLoginModal";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#about", label: "About Us" },
    { href: "#mission", label: "Our Mission" },
    { href: "#vision", label: "Vision" },
    { href: "#why-us", label: "Why Choose Us" },
    { href: "#contact", label: "Contact" },
  ];

  function openLoginModal() {
    setMobileOpen(false);
    setLoginModalOpen(true);
  }

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-black/30 backdrop-blur-xl border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-brand rounded"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Nova Elite Homes"
                className="h-6 w-6 rounded-sm object-contain"
              />
              <span className="text-sm font-semibold text-foreground tracking-tight">
                Nova Elite Homes
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-white/80 hover:text-white transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-3">
              <a
                href="tel:03302296964"
                className="text-sm text-white font-medium hover:text-brand transition-colors"
              >
                0330 229 6964
              </a>
              <button
                type="button"
                onClick={openLoginModal}
                className="px-5 py-2.5 border border-white/40 text-white text-sm font-medium rounded-md hover:border-brand hover:bg-brand hover:text-foreground transition-colors duration-200"
              >
                Sign in
              </button>
              <Link
                href="#contact"
                className="px-5 py-2.5 bg-brand text-foreground text-sm font-medium rounded-md hover:bg-brand-dark transition-colors duration-200"
              >
                Contact Us
              </Link>
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2"
              aria-label="Toggle menu"
              type="button"
            >
              <div className="w-6 h-5 flex flex-col justify-between">
                <span
                  className={`h-0.5 w-full bg-white transition-all duration-300 ${
                    mobileOpen ? "rotate-45 translate-y-2" : ""
                  }`}
                />
                <span
                  className={`h-0.5 w-full bg-white transition-all duration-300 ${
                    mobileOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`h-0.5 w-full bg-white transition-all duration-300 ${
                    mobileOpen ? "-rotate-45 -translate-y-2" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-border">
            <div className="px-6 py-6 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block text-foreground hover:text-brand transition-colors text-base"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-border space-y-3">
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="block w-full text-center px-5 py-3 border border-border text-foreground font-medium rounded-md"
                >
                  Sign in
                </button>
                <Link
                  href="#contact"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center px-5 py-3 bg-brand text-foreground font-medium rounded-md"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      <InvestorLoginModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </>
  );
}
