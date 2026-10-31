"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useBranding } from "@/components/providers/BrandingProvider";

const HERO_IMAGES = [
  {
    src: "/brand/dreamed-it-campaign.jpg",
    alt: "House In Hand — You've dreamed it. Now we're building it.",
  },
  {
    src: "/brand/control-campaign.jpg",
    alt: "House In Hand — more control over your housing experience",
  },
  {
    src: "/brand/renting-stress-campaign.jpg",
    alt: "House In Hand — easing the stressful parts of renting",
  },
] as const;

export default function Hero() {
  const { branding } = useBranding();
  const name = branding.appName || "House In Hand";
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % HERO_IMAGES.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-navy">
      <AnimatePresence mode="sync">
        {HERO_IMAGES.map((image, i) =>
          i === active ? (
            <motion.div
              key={image.src}
              className="absolute inset-0"
              initial={reduce ? false : { opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: reduce ? 0 : 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt=""
                className="h-full w-full object-cover object-[center_20%] sm:object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-navy/45" />
              <div className="absolute inset-0 bg-gradient-to-r from-navy/95 via-navy/55 to-navy/25" />
            </motion.div>
          ) : null
        )}
      </AnimatePresence>

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-16 pt-28 sm:justify-center sm:px-6 sm:pb-24 lg:px-8">
        <motion.div
          className="max-w-xl"
          initial={reduce ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-display text-3xl font-semibold tracking-tight text-sand sm:text-4xl lg:text-5xl">
            {name}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Property. In your hands.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-sand/80 sm:text-lg">
            Verified housing across Nigeria — find, rent, and manage with clarity
            from the first viewing to rent day.
          </p>
          <motion.div
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
          >
            <Link href="/register" className="site-btn site-btn-teal">
              Find a home
            </Link>
            <Link href="/how-it-works" className="site-btn site-btn-ghost">
              See how it works
            </Link>
          </motion.div>
        </motion.div>

        <div className="mt-10 flex gap-2 sm:mt-14" aria-hidden>
          {HERO_IMAGES.map((image, i) => (
            <button
              key={image.src}
              type="button"
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-8 bg-teal" : "w-4 bg-sand/35 hover:bg-sand/55"
              }`}
              aria-label={`Show campaign image ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
