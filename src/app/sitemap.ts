import type { MetadataRoute } from "next";
import { connectDB } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { BlogPost } from "@/models/BlogPost";
import { NIGERIA_SEO_LOCATIONS } from "@/lib/seo/nigeria-locations";
import { getSiteUrl } from "@/lib/seo/site";

/** Regenerates often so new listings/posts improve discoverability automatically */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticPaths: MetadataRoute.Sitemap = [
    "",
    "/house-hunting",
    "/how-it-works",
    "/property-management",
    "/listings",
    "/blog",
    "/faq",
    "/about",
    "/contact",
    "/pricing",
    "/legal/terms",
    "/legal/privacy",
    "/register",
    "/login",
  ].map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency:
      path === "" || path === "/listings" || path === "/house-hunting"
        ? "daily"
        : "weekly",
    priority:
      path === ""
        ? 1
        : path === "/listings" || path === "/house-hunting"
          ? 0.95
          : 0.7,
  }));

  const locationPaths: MetadataRoute.Sitemap = NIGERIA_SEO_LOCATIONS.map(
    (loc) => ({
      url: `${base}/house-hunting/${loc.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: ["lagos", "abuja", "ogun", "oyo", "rivers"].includes(loc.slug)
        ? 0.9
        : 0.75,
    })
  );

  let listingPaths: MetadataRoute.Sitemap = [];
  let blogPaths: MetadataRoute.Sitemap = [];

  try {
    await connectDB();
    const [listings, posts] = await Promise.all([
      Listing.find({
        availabilityStatus: { $in: ["available", "pending"] },
        verificationStatus: "verified",
      })
        .select("_id updatedAt publishedAt")
        .sort({ updatedAt: -1 })
        .limit(5000)
        .lean(),
      BlogPost.find({ status: "published" })
        .select("slug updatedAt publishedAt")
        .sort({ publishedAt: -1 })
        .limit(1000)
        .lean(),
    ]);

    listingPaths = listings.map((l) => ({
      url: `${base}/listings/${String(l._id)}`,
      lastModified: l.updatedAt || l.publishedAt || now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

    blogPaths = posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt || p.publishedAt || now,
      changeFrequency: "weekly" as const,
      priority: 0.65,
    }));
  } catch (err) {
    console.warn("sitemap dynamic entries unavailable:", err);
  }

  return [...staticPaths, ...locationPaths, ...listingPaths, ...blogPaths];
}
