import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClosingCta from "@/components/ClosingCta";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  getPriorityLocations,
  NIGERIA_SEO_LOCATIONS,
} from "@/lib/seo/nigeria-locations";

export const metadata: Metadata = buildPageMetadata({
  title: "House Hunting in Nigeria — Lagos, Abuja, Ogun, Oyo & All States",
  description:
    "House hunting across Nigeria on House In Hands. Browse verified homes for rent in Lagos, Abuja, Ogun, Oyo, Rivers and every state — clearer listings, digital applications and trusted property tools.",
  path: "/house-hunting",
  keywords: [
    "house hunting Nigeria",
    "house platforms Nigeria",
    "rent house Lagos Abuja",
    "find apartment Nigeria",
  ],
});

export default function HouseHuntingHubPage() {
  const priority = getPriorityLocations();

  return (
    <div className="site-page">
      <Navbar />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "House hunting", path: "/house-hunting" },
        ]}
      />
      <main className="pt-28">
        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              House hunting Nigeria
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Find homes across Lagos, Abuja and every state in Nigeria
            </h1>
            <p className="mt-5 max-w-2xl text-sand/70 text-lg leading-relaxed">
              House In Hands is the property platform for verified rentals,
              clearer costs and digital management — wherever you are hunting in
              Nigeria.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/listings" className="site-btn site-btn-teal">
                Browse all listings
              </Link>
              <Link href="/register" className="site-btn site-btn-ghost">
                Create free account
              </Link>
            </div>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Popular locations</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              Start where demand is highest
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {priority.map((loc) => (
                <Link
                  key={loc.slug}
                  href={`/house-hunting/${loc.slug}`}
                  className="border border-navy/10 bg-surface p-5 transition hover:border-teal"
                >
                  <h3 className="font-display text-lg font-semibold text-navy">
                    {loc.name}
                  </h3>
                  <p className="mt-2 text-xs text-muted">
                    House hunting · rentals · verified listings
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">All of Nigeria</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              House hunting by state
            </h2>
            <p className="mt-4 max-w-2xl text-muted">
              Dedicated pages for every Nigerian state help people searching for
              homes near them discover House In Hands.
            </p>
            <ul className="mt-10 grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {NIGERIA_SEO_LOCATIONS.map((loc) => (
                <li key={loc.slug}>
                  <Link
                    href={`/house-hunting/${loc.slug}`}
                    className="text-sm font-medium text-navy/80 hover:text-teal-dark"
                  >
                    House hunting in {loc.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
