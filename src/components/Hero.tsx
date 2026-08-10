"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative">
      <div className="relative h-[100svh] min-h-[500px] sm:min-h-[600px] sm:h-[85vh] overflow-hidden">
        <motion.img
          src="/hero-london.png"
          alt="Housing across Nigeria"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.08, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: "easeOut" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/75 via-black/55 to-black/25 sm:to-transparent" />

        <div className="relative h-full max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 flex items-end sm:items-center pb-24 sm:pb-0 pt-20">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          >
            <motion.p
              className="font-display text-brand text-lg sm:text-xl font-semibold tracking-tight mb-3 sm:mb-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
            >
              House In Hand
            </motion.p>
            <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
              Housing in one place
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg text-white/85 leading-relaxed max-w-xl">
              Discover, rent, and manage homes across Nigeria — verified
              listings, digital agreements, and rent tools for students,
              tenants, landlords, and estate managers.
            </p>
            <motion.div
              className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 sm:px-7 py-3 sm:py-3.5 bg-brand text-foreground font-semibold rounded-md hover:bg-brand-dark transition-colors text-sm sm:text-base"
              >
                Find a home
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 sm:px-7 py-3 sm:py-3.5 bg-white text-foreground font-medium rounded-md hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                List a property
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
