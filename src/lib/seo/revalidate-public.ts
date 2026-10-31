import { revalidatePath } from "next/cache";
import { getLocationBySlug, NIGERIA_SEO_LOCATIONS } from "@/lib/seo/nigeria-locations";

/** Refresh public SEO surfaces when marketplace content changes. */
export function revalidatePublicSeo(opts?: {
  listingId?: string;
  blogSlug?: string;
  state?: string;
  city?: string;
}) {
  revalidatePath("/sitemap.xml");
  revalidatePath("/feed.xml");
  revalidatePath("/listings");
  revalidatePath("/house-hunting");
  revalidatePath("/blog");
  revalidatePath("/");

  if (opts?.listingId) {
    revalidatePath(`/listings/${opts.listingId}`);
  }
  if (opts?.blogSlug) {
    revalidatePath(`/blog/${opts.blogSlug}`);
  }

  const state = opts?.state?.trim();
  if (state) {
    const loc =
      NIGERIA_SEO_LOCATIONS.find(
        (l) =>
          l.stateMatch.toLowerCase() === state.toLowerCase() ||
          l.name.toLowerCase() === state.toLowerCase() ||
          l.slug === state.toLowerCase().replace(/\s+/g, "-")
      ) || null;
    if (loc) {
      revalidatePath(`/house-hunting/${loc.slug}`);
    }
  }

  const city = opts?.city?.trim();
  if (city) {
    const cityLoc = getLocationBySlug(city.toLowerCase().replace(/\s+/g, "-"));
    if (cityLoc) {
      revalidatePath(`/house-hunting/${cityLoc.slug}`);
    }
  }
}
