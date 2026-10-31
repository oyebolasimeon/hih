import Link from "next/link";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClosingCta from "@/components/ClosingCta";
import LocationLandmarkCard from "@/components/house-hunting/LocationLandmarkCard";
import { BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { getLandmarkForSlug } from "@/lib/seo/nigeria-landmarks";
import {
  getPriorityLocations,
  NIGERIA_SEO_LOCATIONS,
} from "@/lib/seo/nigeria-locations";

export const metadata: Metadata = buildPageMetadata({
  title:
    "House Hunting Websites in Nigeria — Lagos, Abuja & All States | House In Hands",
  description:
    "House hunting websites in Lagos and across Nigeria? House In Hands helps you find verified homes for rent in Lagos, Abuja, Ogun, Oyo, Rivers and every state — clearer listings, digital applications and trusted property tools.",
  path: "/house-hunting",
  keywords: [
    "house hunting websites in Lagos",
    "house hunting websites Nigeria",
    "house hunting Nigeria",
    "house platforms Nigeria",
    "rent house Lagos Abuja",
    "find apartment Nigeria",
  ],
});

export default function HouseHuntingHubPage() {
  const priority = getPriorityLocations();
  const states = NIGERIA_SEO_LOCATIONS.filter((l) => !l.cityMatch);
  const cities = NIGERIA_SEO_LOCATIONS.filter((l) => Boolean(l.cityMatch));
  const lagos = getLandmarkForSlug("lagos");

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
        <section className="relative min-h-[58svh] overflow-hidden bg-navy text-sand sm:min-h-[64svh]">
          <div className="absolute inset-0 grid grid-cols-2 opacity-70">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lagos.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lagos.imageUrlSecondary || lagos.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/55" />
          <div className="relative mx-auto flex min-h-[58svh] max-w-7xl flex-col justify-end px-5 pb-14 pt-28 sm:min-h-[64svh] sm:px-6 sm:pb-20 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              House hunting Nigeria
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
              House hunting websites for Lagos, Abuja and every Nigerian state
            </h1>
            <p className="mt-5 max-w-2xl text-sand/75 text-lg leading-relaxed">
              House In Hands is a trusted house hunting platform for Nigeria.
              Start with Lagos landmarks like the Lekki–Ikoyi Link Bridge, then
              browse verified rentals nationwide.
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
            <p className="mt-4 max-w-2xl text-muted">
              Each place is introduced by a monument locals recognise — so you
              know exactly where you are hunting.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {priority.map((loc) => (
                <LocationLandmarkCard
                  key={loc.slug}
                  slug={loc.slug}
                  name={loc.name}
                  href={`/house-hunting/${loc.slug}`}
                  size="featured"
                />
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
              Dedicated pages for every Nigerian state — each with a landmark
              that defines the place.
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {states.map((loc) => (
                <LocationLandmarkCard
                  key={loc.slug}
                  slug={loc.slug}
                  name={loc.name}
                  href={`/house-hunting/${loc.slug}`}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="site-kicker">Cities & areas</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-navy sm:text-4xl">
              Popular neighbourhoods
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {cities.map((loc) => (
                <LocationLandmarkCard
                  key={loc.slug}
                  slug={loc.slug}
                  name={loc.name}
                  href={`/house-hunting/${loc.slug}`}
                />
              ))}
            </div>
          </div>
        </section>

        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
