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
      .limit(12)
      .lean();
    listings = rows.map(serializePublicTeaser);
  } catch (err) {
    console.error("Public listings fetch failed:", err);
  }

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-16 sm:pb-24 bg-white min-h-screen">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-8 space-y-8">
          <div>
            <p className="text-brand font-medium text-sm uppercase tracking-wider">
              Listings
            </p>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-foreground">
              Homes & hostels preview
            </h1>
            <p className="mt-4 text-muted max-w-2xl">
              A sample of verified properties on House In Hand. Sign up to search
              full details and apply.
            </p>
          </div>

          {listings.length === 0 ? (
            <EmptyState
              title="Listings coming soon"
              description="Verified properties will appear here. Create an account to be ready when they go live."
            />
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((l) => (
                <li key={l.id} className="border border-border rounded-lg overflow-hidden">
                  {l.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.imageUrl}
                      alt=""
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div className="h-40 w-full bg-surface" />
                  )}
                  <div className="p-4 space-y-1">
                    <p className="font-semibold line-clamp-1">{l.title}</p>
                    <p className="text-sm text-muted">
                      {l.city}
                      {l.city && l.state ? ", " : ""}
                      {l.state} · {l.listingType}
                    </p>
                    <p className="text-sm font-medium">{formatPrice(l.price)}</p>
                    <p className="text-xs text-muted line-clamp-2">
                      {l.description}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="app-btn app-btn-primary inline-flex">
              Sign up to browse & apply
            </Link>
            <Link href="/login" className="app-btn app-btn-secondary inline-flex">
              Log in
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
