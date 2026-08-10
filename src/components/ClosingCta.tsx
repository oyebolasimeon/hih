"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function ClosingCta() {
  return (
    <section className="relative overflow-hidden bg-teal">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #F4E9D8 0%, transparent 45%), radial-gradient(circle at 90% 10%, #0B1F3A 0%, transparent 40%)",
        }}
        aria-hidden
      />
      <motion.div
        className="relative mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-28 lg:px-8"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <p className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl max-w-2xl">
          Ready to put your next home in hand?
        </p>
        <p className="mt-4 max-w-lg text-white/85 text-base sm:text-lg">
          Join tenants and property owners already moving their housing cycle
          onto one trusted platform.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="site-btn bg-navy text-sand hover:bg-navy-deep"
          >
            Create your account
          </Link>
          <Link
            href="/contact"
            className="site-btn border border-white/50 text-white hover:bg-white/10"
          >
            Talk to us
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
