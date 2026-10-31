import Link from "next/link";
import type { Metadata } from "next";
import mongoose from "mongoose";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EmptyState from "@/components/ui/EmptyState";
import PublicListingDetail from "@/components/PublicListingDetail";
import { connectDB } from "@/lib/db";
import { serializePublicListing } from "@/lib/listing-serialize";
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
    if (!listing) return { title: "Listing | House In Hand" };
    return {
      title: `${listing.title} | House In Hand`,
      description: listing.description.slice(0, 160),
    };
  } catch {
    return { title: "Listing | House In Hand" };
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
      <main className="pt-28">
        {!listing ? (
          <section className="site-section">
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
