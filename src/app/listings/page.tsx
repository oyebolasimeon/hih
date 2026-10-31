import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { serializePublicTeaser } from "@/lib/listing-serialize";

function formatPrice(p: { amount: number; currency: string; period: string }) {
  try {
    return `${new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: p.currency || "NGN",
      maximumFractionDigits: 0,
    }).format(p.amount)} / ${p.period}`;
  } catch {
    return `${p.currency} ${p.amount} / ${p.period}`;
  }
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

  return (
    <div className="site-page">
      <Navbar />
      <main className="pt-28">
        <section className="bg-navy text-sand">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">
              Listings
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Homes worth holding
            </h1>
            <p className="mt-4 max-w-xl text-sand/70">
              Browse full property details as a guest — photos, amenities, location,
              and rent. Sign up when you&apos;re ready to apply.
            </p>
          </div>
        </section>

        <section className="site-section">
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 space-y-10">
            {listings.length === 0 ? (
              <EmptyState
                title="Listings coming online"
                description="Verified homes will show here. Create an account to be ready."
              >
                <Link href="/register" className="site-btn site-btn-teal">
                  Get started
                </Link>
              </EmptyState>
            ) : (
              <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((l) => (
                  <li key={l.id}>
                    <Link
                      href={`/listings/${l.id}`}
                      className="group block h-full"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-surface-dark relative">
                        {l.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={l.imageUrl}
                            alt=""
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : null}
                        {l.featured ? (
                          <span className="absolute left-3 top-3 rounded-full bg-navy/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-sand">
                            Featured
                          </span>
                        ) : null}
                        {l.imageCount > 1 ? (
                          <span className="absolute bottom-3 right-3 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white">
                            {l.imageCount} photos
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-4 space-y-1.5">
                        <p className="font-display text-lg font-semibold text-navy line-clamp-1 group-hover:text-teal-dark transition-colors">
                          {l.title}
                        </p>
                        <p className="text-sm text-muted">
                          {[l.street, l.city, l.state].filter(Boolean).join(", ")} ·{" "}
                          {l.listingType}
                        </p>
                        <p className="text-sm text-muted">
                          {[
                            l.bedrooms != null ? `${l.bedrooms} bed` : null,
                            l.bathrooms != null ? `${l.bathrooms} bath` : null,
                            l.sizeSqm != null ? `${l.sizeSqm} sqm` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "View full details"}
                        </p>
                        {l.amenities?.length ? (
                          <p className="text-xs text-muted line-clamp-1">
                            {l.amenities.slice(0, 4).join(" · ")}
                            {l.amenities.length > 4
                              ? ` +${l.amenities.length - 4} more`
                              : ""}
                          </p>
                        ) : null}
                        <p className="text-sm font-semibold text-teal-dark pt-1">
                          {formatPrice(l.price)}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap gap-3 border-t border-border pt-8">
              <p className="w-full text-sm text-muted mb-1">
                Ready to apply for a home?
              </p>
              <Link href="/register" className="site-btn site-btn-teal">
                Create free account
              </Link>
              <Link href="/login" className="site-btn site-btn-outline">
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
