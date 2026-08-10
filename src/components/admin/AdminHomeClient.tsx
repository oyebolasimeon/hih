"use client";

import Link from "next/link";
import { Reveal, Stagger, StaggerItem } from "@/components/motion/Motion";

type Card = {
  href: string;
  title: string;
  description: string;
};

export default function AdminHomeClient({ cards }: { cards: Card[] }) {
  return (
    <div className="space-y-6">
      <Reveal>
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-teal mb-3">
          <span className="site-live-dot" aria-hidden />
          Operations
        </div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Admin Console
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Operate House In Hand — KYC, listings, website content, and fraud
          reports.
        </p>
      </Reveal>

      <Stagger className="grid sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <StaggerItem key={card.href}>
            <Link
              href={card.href}
              className="app-card app-card-interactive p-5 sm:p-6 block"
            >
              <h2 className="font-display text-lg font-semibold">{card.title}</h2>
              <p className="mt-2 text-sm text-muted">{card.description}</p>
              <span className="mt-4 inline-block text-sm font-medium text-brand-dark">
                Open →
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}
