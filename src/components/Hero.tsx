"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useBranding } from "@/components/providers/BrandingProvider";

export default function Hero() {
  const { branding } = useBranding();
  const name = branding.appName || "House In Hand";

  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-navy">
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-home.jpg"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/75 to-navy/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/40 to-transparent" />
      </motion.div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-end px-5 pb-16 pt-28 sm:justify-center sm:px-6 sm:pb-24 lg:px-8">
        <motion.div
          className="max-w-xl"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="font-display text-3xl font-semibold tracking-tight text-sand sm:text-4xl lg:text-5xl">
            {name}
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            A home you can hold onto
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-sand/80 sm:text-lg">
            Verified housing across Nigeria — find, rent, and manage with clarity
            from the first viewing to rent day.
          </p>
          <motion.div
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <Link href="/register" className="site-btn site-btn-teal">
              Find a home
            </Link>
            <Link href="/how-it-works" className="site-btn site-btn-ghost">
              See how it works
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
