"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const audiences = [
  {
    title: "Tenants",
    body: "Search verified homes, understand pricing, apply directly and manage your rental journey.",
    href: "/register",
  },
  {
    title: "Landlords",
    body: "List properties, manage tenants, collect rent, coordinate maintenance and monitor assets remotely.",
    href: "/register",
  },
  {
    title: "Property managers",
    body: "Manage portfolios, occupancy, leases, maintenance, collections and records from one workspace.",
    href: "/register",
  },
  {
    title: "Developers & investors",
    body: "Showcase inventory, reach customers and use property intelligence for better decisions.",
    href: "/register",
  },
];

export default function AudienceStrip() {
  const reduce = useReducedMotion();

  return (
    <section className="site-section bg-navy text-sand">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal inline-flex items-center gap-2">
            <span className="site-live-dot" aria-hidden />
            Our broader ecosystem
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-sand sm:text-4xl">
            Built for every side of property
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {audiences.map((a, i) => (
            <motion.div
              key={a.title}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={
                reduce
                  ? undefined
                  : { backgroundColor: "rgba(255,255,255,0.04)" }
              }
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
                Get started →
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
