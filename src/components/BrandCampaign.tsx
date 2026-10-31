"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const panels = [
  {
    src: "/brand/housing-story-campaign.jpg",
    alt: "House In Hand — Nigeria’s housing story is evolving, and you're part of it",
  },
  {
    src: "/brand/dreamed-it-campaign.jpg",
    alt: "House In Hand — You've dreamed it. Now we're building it.",
  },
  {
    src: "/brand/control-campaign.jpg",
    alt: "House In Hand — the feeling of having more control over your housing experience",
  },
  {
    src: "/brand/renting-stress-campaign.jpg",
    alt: "House In Hand — easing the stressful parts of renting a home in Nigeria",
  },
] as const;

export default function BrandCampaign() {
  const reduce = useReducedMotion();

  return (
    <section className="bg-navy" aria-label="House In Hand brand story">
      <div className="mx-auto max-w-7xl px-5 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7 }}
          className="max-w-2xl"
        >
          <p className="site-kicker text-teal">Property. In your hands.</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-sand sm:text-4xl">
            Housing that feels clearer from the first look
          </h2>
        </motion.div>
      </div>

      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4">
        {panels.map((panel, i) => (
          <motion.figure
            key={panel.src}
            initial={reduce ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, delay: i * 0.12 }}
            className="relative m-0 min-h-[70vh] overflow-hidden bg-navy"
          >
            <motion.img
              src={panel.src}
              alt={panel.alt}
              className="absolute inset-0 h-full w-full object-cover object-center"
              animate={
                reduce
                  ? undefined
                  : { scale: [1.04, 1, 1.03] }
              }
              transition={
                reduce
                  ? undefined
                  : { duration: 22, repeat: Infinity, ease: "easeInOut", delay: i * 2 }
              }
            />
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/35 via-transparent to-transparent"
              aria-hidden
            />
          </motion.figure>
        ))}
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="max-w-xl text-sm leading-relaxed text-sand/75 sm:text-base">
          Verified listings, digital agreements, and rent tools — so finding and
          keeping a home feels less like a scramble.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/listings" className="site-btn site-btn-teal">
            Browse listings
          </Link>
          <Link href="/register" className="site-btn site-btn-ghost">
            Get started
          </Link>
        </div>
      </div>
    </section>
  );
}
