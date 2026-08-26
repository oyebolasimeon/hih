"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import BrandMark from "@/components/BrandMark";

const navLinks = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/listings", label: "Listings" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/blog", label: "Stories" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = pathname === "/";
  const solid = !isHome || scrolled || mobileOpen;
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen, pathname]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-400 ${
        solid ? "site-nav-solid" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center px-5 sm:px-6 lg:px-8">
        <button
          type="button"
          className="lg:hidden p-2 text-sand shrink-0"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((o) => !o)}
        >
          <span className="flex h-5 w-6 flex-col justify-between">
            <span
              className={`h-0.5 w-full bg-current transition duration-300 ${
                mobileOpen ? "translate-y-[9px] rotate-45" : ""
              }`}
            />
            <span
              className={`h-0.5 w-full bg-current transition duration-300 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`h-0.5 w-full bg-current transition duration-300 ${
                mobileOpen ? "-translate-y-[9px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>

        <div className="hidden lg:block shrink-0">
          <BrandMark invert />
        </div>

        <nav className="hidden lg:flex flex-1 items-center justify-center gap-8">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative text-sm font-medium transition-colors ${
                  active ? "text-teal" : "text-sand/75 hover:text-sand"
                }`}
              >
                {link.label}
                {active && !reduce ? (
                  <motion.span
                    layoutId="site-nav-underline"
                    className="absolute -bottom-1 left-0 right-0 h-px bg-teal"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          <Link
            href="/login"
            className="text-sm font-medium text-sand/80 hover:text-sand transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="site-btn site-btn-teal !py-2.5 !px-5 text-sm"
          >
            Get started
          </Link>
        </div>

        <div className="lg:hidden ml-auto shrink-0">
          <BrandMark invert size="sm" />
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-navy/60 backdrop-blur-sm lg:hidden"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,18rem)] flex-col bg-navy border-r border-white/10 shadow-xl lg:hidden"
              initial={reduce ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduce ? undefined : { x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <div className="border-b border-white/10 px-5 py-5">
                <BrandMark invert href="/" size="sm" showLabel />
                <p className="mt-2 text-xs text-sand/60">Menu</p>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 space-y-1">
                {navLinks.map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={reduce ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.03 * i }}
                  >
                    <Link
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`block rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                        pathname === link.href
                          ? "bg-white/10 text-teal"
                          : "text-sand/90 hover:bg-white/5 hover:text-sand"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ))}
              </nav>
              <div className="border-t border-white/10 p-4 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="site-btn site-btn-ghost w-full"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileOpen(false)}
                  className="site-btn site-btn-teal w-full"
                >
                  Get started
                </Link>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
