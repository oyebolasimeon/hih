"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const slides = [
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
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % slides.length);
    }, 6500);
    return () => window.clearInterval(id);
  }, [reduce]);

  function go(delta: number) {
    setActive((i) => (i + delta + slides.length) % slides.length);
  }

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

      <div className="relative mt-10 px-5 sm:px-6 lg:px-8">
        {/* Assets are 819×1024 (4:5) — keep that frame so copy/logo aren’t cropped */}
        <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-sm sm:max-w-lg md:max-w-xl lg:max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.img
              key={slides[active].src}
              src={slides[active].src}
              alt={slides[active].alt}
              className="absolute inset-0 h-full w-full object-contain object-center"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>

          <button
            type="button"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/25 bg-navy/55 px-3 py-2 text-sand backdrop-blur-sm transition hover:bg-navy/75 sm:left-5"
            aria-label="Previous campaign image"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/25 bg-navy/55 px-3 py-2 text-sand backdrop-blur-sm transition hover:bg-navy/75 sm:right-5"
            aria-label="Next campaign image"
          >
            →
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => setActive(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-8 bg-teal" : "w-4 bg-sand/35 hover:bg-sand/55"
              }`}
              aria-label={`Show campaign slide ${i + 1}`}
              aria-current={i === active}
            />
          ))}
        </div>
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
