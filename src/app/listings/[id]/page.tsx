import Link from "next/link";
import type { Metadata } from "next";
import mongoose from "mongoose";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmptyState from "@/components/ui/EmptyState";
import PublicListingDetail from "@/components/PublicListingDetail";
import { ListingJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import { connectDB } from "@/lib/db";
import { serializePublicListing } from "@/lib/listing-serialize";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";

type PageProps = { params: Promise<{ id: string }> };

async function loadPublicListing(id: string) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await connectDB();
  const listing = await Listing.findOne({
    _id: id,
    availabilityStatus: { $in: ["available", "pending"] },
    verificationStatus: "verified",
  }).lean();
  if (!listing) return null;

  const owner = await Profile.findById(listing.ownerProfileId)
    .select("displayName status")
    .lean();

  return serializePublicListing(listing, {
    ownerDisplayName: owner?.displayName,
    ownerVerified: owner?.status === "verified",
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const listing = await loadPublicListing(id);
    if (!listing) return { title: "Listing not found" };
    const loc = [listing.address.city, listing.address.state]
      .filter(Boolean)
      .join(", ");
    const cover =
      listing.images.find((i) => i.mediaType !== "video")?.url ||
      listing.images[0]?.url;
    return buildPageMetadata({
      title: `${listing.title} for rent in ${loc}`,
      description:
        listing.description.slice(0, 155) ||
        `Verified home for rent in ${loc} on House In Hands — house hunting made clearer.`,
      path: `/listings/${listing.id}`,
      image: cover,
      keywords: [
        `rent ${listing.address.city}`,
        `house hunting ${listing.address.state}`,
        listing.listingType,
        "House In Hands",
      ],
    });
  } catch {
    return { title: "Listing" };
  }
}

export default async function PublicListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  let listing: ReturnType<typeof serializePublicListing> | null = null;

  try {
    listing = await loadPublicListing(id);
  } catch (err) {
    console.error("Public listing detail failed:", err);
  }

  return (
    <div className="site-page">
      <Navbar />
      {listing ? (
        <>
          <BreadcrumbJsonLd
            items={[
              { name: "Home", path: "/" },
              { name: "Listings", path: "/listings" },
              { name: listing.title, path: `/listings/${listing.id}` },
            ]}
          />
          <ListingJsonLd
            id={listing.id}
            title={listing.title}
            description={listing.description}
            image={
              listing.images.find((i) => i.mediaType !== "video")?.url ||
              listing.images[0]?.url
            }
            price={listing.price.amount}
            currency={listing.price.currency}
            period={listing.price.period}
            street={listing.address.street}
            city={listing.address.city}
            state={listing.address.state}
            country={listing.address.country}
          />
        </>
      ) : null}
      <main>
        {!listing ? (
          <section className="site-section pt-28">
            <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
              <EmptyState
                title="Listing unavailable"
                description="This property may have been removed or is no longer available."
              >
                <Link href="/listings" className="site-btn site-btn-teal">
                  Back to listings
                </Link>
              </EmptyState>
            </div>
          </section>
        ) : (
          <PublicListingDetail listing={listing} />
        )}
      </main>
      <Footer />
    </div>
  );
}
