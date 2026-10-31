import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.AUTH_URL || "https://houseinhands.com").replace(
    /\/$/,
    ""
  );
  const now = new Date();
  const paths = [
    "",
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
  ];
  return paths.map((path) => ({
    url: `${base}${path || "/"}`,
    lastModified: now,
    changeFrequency: path === "" || path === "/blog" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
