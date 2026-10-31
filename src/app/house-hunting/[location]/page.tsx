import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ClosingCta from "@/components/ClosingCta";
import { BreadcrumbJsonLd, JsonLd } from "@/components/seo/JsonLd";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { serializePublicTeaser } from "@/lib/listing-serialize";
import { buildPageMetadata } from "@/lib/seo/metadata";
import {
  getLocationBySlug,
  listingFilterForLocation,
  NIGERIA_SEO_LOCATIONS,
} from "@/lib/seo/nigeria-locations";
import { getSiteUrl } from "@/lib/seo/site";

type PageProps = { params: Promise<{ location: string }> };

export function generateStaticParams() {
  return NIGERIA_SEO_LOCATIONS.map((l) => ({ location: l.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { location: slug } = await params;
  const loc = getLocationBySlug(slug);
  if (!loc) return { title: "House hunting" };
  return buildPageMetadata({
    title: loc.title,
    description: loc.description,
    path: `/house-hunting/${loc.slug}`,
    keywords: loc.keywords,
  });
}

export const revalidate = 3600;

export default async function HouseHuntingLocationPage({ params }: PageProps) {
  const { location: slug } = await params;
  const loc = getLocationBySlug(slug);
  if (!loc) notFound();

  let listings: ReturnType<typeof serializePublicTeaser>[] = [];
  try {
    await connectDB();
    const rows = await Listing.find(listingFilterForLocation(loc))
      .sort({ featured: -1, publishedAt: -1 })
      .limit(24)
      .lean();
    listings = rows.map((r) => serializePublicTeaser(r));
  } catch {
    /* page still ranks with evergreen copy */
  }

  const url = getSiteUrl();

  return (
    <div className="site-page">
      <Navbar />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "House hunting", path: "/house-hunting" },
          { name: loc.name, path: `/house-hunting/${loc.slug}` },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `House hunting in ${loc.name}, Nigeria`,
          description: loc.description,
          url: `${url}/house-hunting/${loc.slug}`,
          isPartOf: { "@type": "WebSite", name: "House In Hands", url },
          about: {
            "@type": "Place",
            name: loc.name,
            address: {
              "@type": "PostalAddress",
              addressRegion: loc.stateMatch,
              addressCountry: "NG",
            },
          },
        }}
      />
      <main className="pt-28">
        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              House hunting · {loc.name}
            </p>
            <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
              House hunting in {loc.name}, Nigeria
            </h1>
            <p className="mt-5 max-w-2xl text-sand/70 text-lg leading-relaxed">
              Search verified homes for rent in {loc.name} on House In Hands —
              clearer listings, direct landlord connections and digital rent
              tools built for Nigeria.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/listings?state=${encodeURIComponent(loc.stateMatch)}`}
                className="site-btn site-btn-teal"
              >
                View {loc.name} listings
              </Link>
              <Link href="/register" className="site-btn site-btn-ghost">
                Start free
              </Link>
            </div>
          </div>
        </section>

        <section className="site-section bg-sand">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8 space-y-5 text-muted leading-relaxed">
            <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">
              Why house hunters in {loc.name} use House In Hands
            </h2>
            <p>
              Finding a home in {loc.name} should not mean opaque fees,
              unverified agents or endless chats. House In Hands is a property
              technology platform for Nigeria that helps tenants and landlords
              discover, verify, agree and manage property in one place.
            </p>
            <p>
              Whether you need an apartment in {loc.name}, a family house, a
              student-friendly room or commercial space, our marketplace is
              designed around trust, transparency and useful digital tools —
              Property. In Your Hands.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Verified participation and clearer listing information</li>
              <li>Direct connection with property owners and managers</li>
              <li>Digital applications, agreements and rent workflows</li>
              <li>Property management tools after you move in</li>
            </ul>
          </div>
        </section>

        <section className="site-section bg-surface">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold text-navy sm:text-3xl">
              Verified listings in {loc.name}
            </h2>
            {listings.length === 0 ? (
              <p className="mt-4 text-muted">
                New homes in {loc.name} are added regularly.{" "}
                <Link href="/listings" className="text-teal-dark font-semibold">
                  Browse all Nigeria listings
                </Link>{" "}
                or{" "}
                <Link href="/register" className="text-teal-dark font-semibold">
                  create an account
                </Link>{" "}
                to get notified.
              </p>
            ) : (
              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((l) => (
                  <Link
                    key={l.id}
                    href={`/listings/${l.id}`}
                    className="group border border-navy/10 bg-sand overflow-hidden transition hover:border-teal"
                  >
                    <div className="aspect-[16/10] bg-navy/5 overflow-hidden">
                      {l.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.imageUrl}
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                        />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <h3 className="font-display font-semibold text-navy line-clamp-2">
                        {l.title}
                      </h3>
                      <p className="mt-1 text-xs text-muted">
                        {l.city}, {l.state}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-teal-dark">
                        {l.price.currency} {l.price.amount.toLocaleString()} /{" "}
                        {l.price.period}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-border bg-sand py-10">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <p className="text-sm text-muted">
              Also explore:{" "}
              <Link href="/house-hunting" className="text-teal-dark font-medium">
                all Nigeria locations
              </Link>
              {" · "}
              <Link href="/property-management" className="text-teal-dark font-medium">
                property management
              </Link>
              {" · "}
              <Link href="/faq" className="text-teal-dark font-medium">
                FAQ
              </Link>
            </p>
          </div>
        </section>

        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
