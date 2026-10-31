/** Central SEO + social config for House In Hands */

export const SITE_NAME = "House In Hands";
export const SITE_LEGAL_NAME = "House In Hands";
export const SITE_TAGLINE = "Housing you can trust";
export const SITE_MASTER_LINE = "Property. In Your Hands.";
export const SITE_DOMAIN = "houseinhands.com";

const PRODUCTION_SITE_URL = "https://www.houseinhands.com";

function normalizeSiteUrl(raw: string) {
  return raw.trim().replace(/\/$/, "");
}

function isPreviewHost(url: string) {
  try {
    const host = new URL(url).hostname;
    return (
      host.endsWith(".vercel.app") ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return true;
  }
}

/** Public canonical origin for SEO. Never prefer preview/local hosts in production. */
export function getSiteUrl() {
  const configured = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.AUTH_URL,
  ]
    .filter(Boolean)
    .map((v) => normalizeSiteUrl(String(v)));

  const preferred = configured.find((url) => url && !isPreviewHost(url));
  if (preferred) return preferred;

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  return configured[0] || PRODUCTION_SITE_URL;
}

export const SITE_CONTACT = {
  email: "houseinhandsmail@gmail.com",
  phone: "+2347015079484",
  phoneDisplay: "+234 701 507 9484",
  areaServed: "Nigeria",
};

/** Override via env when official handles are confirmed */
export const SITE_SOCIAL = {
  facebook:
    process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK ||
    "https://www.facebook.com/houseinhands",
  instagram:
    process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM ||
    "https://www.instagram.com/houseinhands",
  twitter:
    process.env.NEXT_PUBLIC_SOCIAL_TWITTER ||
    "https://x.com/houseinhands",
  linkedin:
    process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN ||
    "https://www.linkedin.com/company/house-in-hands",
  youtube:
    process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE ||
    "https://www.youtube.com/@houseinhands",
  tiktok:
    process.env.NEXT_PUBLIC_SOCIAL_TIKTOK ||
    "https://www.tiktok.com/@houseinhands",
} as const;

export const SITE_SOCIAL_SAME_AS = Object.values(SITE_SOCIAL);

export const DEFAULT_OG_IMAGE = "/brand/stakeholder-meeting-flyer.png";

export const CORE_KEYWORDS = [
  "House In Hands",
  "house hunting Nigeria",
  "rent house Nigeria",
  "property platform Nigeria",
  "verified landlords Nigeria",
  "apartment for rent Lagos",
  "house for rent Abuja",
  "property management Nigeria",
  "rent apartment Ogun",
  "student hostel Nigeria",
  "estate management Nigeria",
  "digital tenancy Nigeria",
  "proptech Nigeria",
  "find house Nigeria",
  "rent without agent Nigeria",
];

export const DEFAULT_DESCRIPTION =
  "House In Hands — Housing you can trust. Find, rent and manage verified homes across Lagos, Abuja, Ogun, Oyo and all of Nigeria. Property. In Your Hands.";
