"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const audiences = [
  {
    title: "Students",
    body: "Hostels and rooms near campus, with clear terms.",
    href: "/register",
  },
  {
    title: "Tenants",
    body: "Search, apply, sign, and pay rent without chasing anyone.",
    href: "/register",
  },
  {
    title: "Landlords",
    body: "List, verify applicants, and track rent in one console.",
    href: "/register",
  },
  {
    title: "Estate managers",
    body: "Portfolio control across units, leases, and people.",
    href: "/register",
  },
];

export default function AudienceStrip() {
  return (
    <section className="site-section bg-navy text-sand">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
            Built for every side of the lease
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-sand sm:text-4xl">
            One platform. Four ways in.
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((a, i) => (
            <motion.div
              key={a.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="bg-navy p-6 sm:p-8"
            >
              <h3 className="font-display text-xl font-semibold text-sand">
                {a.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-sand/65">{a.body}</p>
              <Link
                href={a.href}
                className="mt-6 inline-flex text-sm font-semibold text-teal hover:text-teal-light transition-colors"
              >
                Start as {a.title.toLowerCase().replace(/s$/, "")} →
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
