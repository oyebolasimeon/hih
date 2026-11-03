import { getSiteUrl } from "@/lib/seo/site";

/** Canonical production origin — https://www.houseinhands.com */
export const PRODUCTION_APP_URL = "https://www.houseinhands.com";

/**
 * Runtime origin for app links (AI deep links, listing urls, emails when SITE_URL is set).
 * Prefers the public site URL over localhost AUTH_URL so assistants never cite local links
 * when the app is deployed at https://www.houseinhands.com.
 */
export function getAppBaseUrl() {
  // getSiteUrl already skips localhost/preview when a public SITE_URL/AUTH_URL exists
  const site = getSiteUrl().replace(/\/$/, "");
  if (site) return site;

  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    (process.env.NODE_ENV === "production"
      ? PRODUCTION_APP_URL
      : "http://localhost:3000");
  return String(raw).trim().replace(/\/$/, "");
}

/** Join base + path. Path should start with `/` (e.g. `/portal/payments`). */
export function appUrl(path: string) {
  const base = getAppBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

/** Known in-app paths the assistants may cite — never invent others. */
export const APP_PATHS = {
  listings: "/listings",
  listing: (id: string) => `/listings/${id}`,
  portalHome: "/portal/home",
  portalPayments: "/portal/payments",
  portalUtilities: "/portal/utilities",
  portalAgreements: "/portal/agreements",
  portalBuildingIssues: "/portal/building-issues",
  portalExitNotices: "/portal/exit-notices",
  portalListings: "/portal/listings",
  portalMaintenance: "/portal/maintenance",
  portalMessages: "/portal/messages",
  messagesThread: (conversationId: string) =>
    `/portal/messages?c=${conversationId}`,
} as const;

export function appLinksBlock() {
  const base = getAppBaseUrl();
  return [
    `APP_BASE_URL: ${base}`,
    "Only share absolute links built from APP_BASE_URL + these real paths. Never invent domains, subdomains, or paths.",
    `Public listings index: ${appUrl(APP_PATHS.listings)}`,
    `Public listing detail: ${base}/listings/{id} (id only from search_listings / context)`,
    `Portal home: ${appUrl(APP_PATHS.portalHome)}`,
    `Payments: ${appUrl(APP_PATHS.portalPayments)}`,
    `Utilities: ${appUrl(APP_PATHS.portalUtilities)}`,
    `Agreements: ${appUrl(APP_PATHS.portalAgreements)}`,
    `Building issues: ${appUrl(APP_PATHS.portalBuildingIssues)}`,
    `Exit notices: ${appUrl(APP_PATHS.portalExitNotices)}`,
    `My listings: ${appUrl(APP_PATHS.portalListings)}`,
    `Maintenance: ${appUrl(APP_PATHS.portalMaintenance)}`,
    `Messages: ${appUrl(APP_PATHS.portalMessages)}`,
  ].join("\n");
}
