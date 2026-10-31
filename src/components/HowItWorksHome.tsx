"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const steps = [
  {
    n: "01",
    title: "Discover",
    body: "Find or list property through a digital marketplace.",
  },
  {
    n: "02",
    title: "Verify & connect",
    body: "Verify participants, review property information, then talk directly.",
  },
  {
    n: "03",
    title: "Agree & pay",
    body: "Organize applications, digital agreements, and property payments.",
  },
  {
    n: "04",
    title: "Manage & grow",
    body: "Run operations, track performance, and use property intelligence.",
  },
];

export default function HowItWorksHome() {
  const reduce = useReducedMotion();

  return (
    <section className="site-section site-ambient bg-sand">
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <p className="site-kicker">How it works</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl lg:text-5xl">
            One connected property journey
          </h2>
          <p className="mt-4 text-muted text-base sm:text-lg leading-relaxed">
            Discover, verify, connect, agree, pay, manage, understand and grow —
            without unnecessary friction or dependence on traditional middlemen.
          </p>
        </motion.div>

        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {steps.map((step, i) => (
            <motion.li
              key={step.n}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              whileHover={reduce ? undefined : { y: -4 }}
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

        <motion.div
          className="mt-12"
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <Link href="/how-it-works" className="site-btn site-btn-outline">
            Full walkthrough
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
