"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const steps = [
  {
    n: "01",
    title: "Create your place in the platform",
    body: "One account. Profiles for students, tenants, landlords, and estate managers.",
  },
  {
    n: "02",
    title: "Verify once, trust every deal",
    body: "KYC-backed identity so both sides know who they are renting with.",
  },
  {
    n: "03",
    title: "Search, agree, and pay in flow",
    body: "Listings, digital agreements, and rent tools stay in one timeline.",
  },
];

export default function HowItWorksHome() {
  return (
    <section className="site-section bg-sand">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <p className="site-kicker">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl lg:text-5xl">
            Housing, end to end — without the scramble
          </h2>
          <p className="mt-4 text-muted text-base sm:text-lg leading-relaxed">
            Built for Nigeria’s rental reality: trust first, then paperwork and
            payments that actually finish.
          </p>
        </motion.div>

        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((step, i) => (
            <motion.li
              key={step.n}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className="border-t border-navy/15 pt-6"
            >
              <span className="font-mono text-sm text-teal">{step.n}</span>
              <h3 className="mt-3 font-display text-xl font-semibold text-navy sm:text-2xl">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
                {step.body}
              </p>
            </motion.li>
          ))}
        </ol>

        <div className="mt-12">
          <Link href="/how-it-works" className="site-btn site-btn-outline">
            Full walkthrough
          </Link>
        </div>
      </div>
    </section>
  );
}
