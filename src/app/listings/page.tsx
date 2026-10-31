import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { serializePublicTeaser } from "@/lib/listing-serialize";

function formatPrice(p: { amount: number; currency: string; period: string }) {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: p.currency || "NGN",
      maximumFractionDigits: 0,
    }).format(p.amount);
  } catch {
    return `${p.currency} ${p.amount.toLocaleString()}`;
  }
}

function typeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
}

export default async function PublicListingsPage() {
  let listings: ReturnType<typeof serializePublicTeaser>[] = [];

  try {
    await connectDB();
    const rows = await Listing.find({
      availabilityStatus: "available",
      verificationStatus: "verified",
    })
      .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
      .limit(60)
      .lean();
    listings = rows.map(serializePublicTeaser);
  } catch (err) {
    console.error("Public listings fetch failed:", err);
  }

  const featured = listings[0] || null;

  return (
    <div className="site-page">
      <Navbar />
      <main>
        <section className="relative min-h-[70svh] overflow-hidden bg-navy">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={featured?.imageUrl || "/hero-home.jpg"}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-navy/90 via-navy/40 to-transparent" />

          <div className="relative mx-auto flex min-h-[70svh] max-w-7xl flex-col justify-end px-5 pb-14 pt-32 sm:px-6 sm:pb-20 lg:px-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal">
              Verified homes
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Homes worth holding
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-sand/80 sm:text-lg">
              Explore every detail as a guest — then apply when you&apos;re ready.
            </p>
            {featured ? (
              <Link
                href={`/listings/${featured.id}`}
                className="mt-8 inline-flex max-w-xl flex-col gap-1 border-t border-white/20 pt-5 transition hover:border-teal"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal">
                  Featured
                </span>
                <span className="font-display text-xl font-semibold text-sand sm:text-2xl">
                  {featured.title}
                </span>
                <span className="text-sm text-sand/70">
                  {[featured.city, featured.state].filter(Boolean).join(", ")} ·{" "}
                  {formatPrice(featured.price)} / {featured.price.period}
                </span>
              </Link>
            ) : null}
          </div>
        </section>

        <section className="site-section site-ambient bg-sand">
          <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            {listings.length === 0 ? (
              <EmptyState
                title="Listings coming online"
                description="Verified homes will appear here soon."
              >
                <Link href="/register" className="site-btn site-btn-teal">
                  Get started
                </Link>
              </EmptyState>
            ) : (
              <>
                <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="site-kicker">Browse</p>
                    <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-navy sm:text-4xl">
                      {listings.length} open {listings.length === 1 ? "home" : "homes"}
                    </h2>
                  </div>
                </div>

                <ul className="space-y-0 divide-y divide-navy/10">
                  {listings.map((l, index) => {
                    const meta = [
                      typeLabel(l.listingType),
                      l.bedrooms != null ? `${l.bedrooms} bed` : null,
                      l.bathrooms != null ? `${l.bathrooms} bath` : null,
                      l.sizeSqm != null ? `${l.sizeSqm} sqm` : null,
                    ].filter(Boolean);

                    return (
                      <li key={l.id}>
                        <Link
                          href={`/listings/${l.id}`}
                          className="group grid gap-5 py-8 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)] sm:gap-8 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)_auto] lg:items-center"
                        >
                          <div className="relative aspect-[5/4] overflow-hidden bg-navy/10 sm:aspect-[4/3]">
                            {l.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={l.imageUrl}
                                alt=""
                                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-sm text-muted">
                                No photo
                              </div>
                            )}
                            <span className="absolute left-3 top-3 font-mono text-[11px] text-sand bg-navy/70 px-2 py-1">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                          </div>

                          <div className="min-w-0 space-y-3 self-center">
                            <div>
                              <h3 className="font-display text-2xl font-semibold tracking-tight text-navy transition group-hover:text-teal-dark sm:text-3xl">
                                {l.title}
                              </h3>
                              <p className="mt-2 text-sm text-muted">
                                {[l.street, l.city, l.state]
                                  .filter(Boolean)
                                  .join(", ")}
                              </p>
                            </div>
                            {meta.length ? (
                              <p className="text-sm text-navy/70">
                                {meta.join(" · ")}
                              </p>
                            ) : null}
                            {l.amenities?.length ? (
                              <p className="text-sm text-muted line-clamp-1">
                                {l.amenities.slice(0, 5).join(" · ")}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex items-end justify-between gap-4 sm:col-span-2 lg:col-span-1 lg:flex-col lg:items-end lg:text-right">
                            <div>
                              <p className="font-display text-xl font-semibold text-navy sm:text-2xl">
                                {formatPrice(l.price)}
                              </p>
                              <p className="text-xs uppercase tracking-[0.12em] text-muted">
                                per {l.price.period}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-teal transition group-hover:translate-x-1">
                              View home →
                            </span>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </section>

        <section className="relative overflow-hidden bg-navy">
          <div className="absolute inset-0 opacity-30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/home-interior.jpg"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-navy/80" />
          <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
            <p className="site-kicker text-teal">Ready when you are</p>
            <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-sand sm:text-4xl">
              Found a home you want to hold onto?
            </h2>
            <p className="mt-4 max-w-lg text-sand/70">
              Create a free account to apply, sign agreements, and pay rent in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="site-btn site-btn-teal">
                Create free account
              </Link>
              <Link href="/login" className="site-btn site-btn-ghost">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
