"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function HomeStory() {
  return (
    <section className="site-section bg-surface overflow-hidden">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          <div className="aspect-[4/3] overflow-hidden bg-sand-deep">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home-interior.jpg"
              alt="A calm living space ready to call home"
              className="h-full w-full object-cover"
            />
          </div>
          <div
            className="pointer-events-none absolute -bottom-6 -right-6 hidden h-32 w-32 bg-teal/20 md:block"
            aria-hidden
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, delay: 0.1 }}
        >
          <p className="site-kicker">Why House In Hand</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl lg:text-5xl">
            Stability you can feel — and prove
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted sm:text-lg">
            Deep navy trust for money and identity. Teal speed for a proptech
            workflow. Warm sand for the human side of home. Every listing and
            profile is verified so agreements start from solid ground.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/listings" className="site-btn site-btn-navy">
              Browse listings
            </Link>
            <Link href="/about" className="site-btn site-btn-outline">
              Our story
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
