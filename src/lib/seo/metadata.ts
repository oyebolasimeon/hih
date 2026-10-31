import type { Metadata } from "next";
import {
  CORE_KEYWORDS,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  SITE_MASTER_LINE,
  SITE_NAME,
  SITE_SOCIAL,
  SITE_TAGLINE,
  getSiteUrl,
} from "@/lib/seo/site";

type BuildMetaInput = {
  title: string;
  description?: string;
  path?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
  type?: "website" | "article";
};

export function absoluteUrl(path = "/") {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildPageMetadata(input: BuildMetaInput): Metadata {
  const description = input.description || DEFAULT_DESCRIPTION;
  const url = absoluteUrl(input.path || "/");
  const image = absoluteUrl(input.image || DEFAULT_OG_IMAGE);
  const title = input.title.includes(SITE_NAME)
    ? input.title
    : `${input.title} | ${SITE_NAME}`;

  return {
    title,
    description,
    keywords: [...CORE_KEYWORDS, ...(input.keywords || [])],
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    metadataBase: new URL(getSiteUrl()),
    alternates: { canonical: url },
    openGraph: {
      type: input.type || "website",
      locale: "en_NG",
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${SITE_TAGLINE}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      site: SITE_SOCIAL.twitter.includes("x.com")
        ? "@houseinhands"
        : undefined,
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
    category: "Real Estate",
    other: {
      "geo.region": "NG",
      "geo.placename": "Nigeria",
    },
  };
}

export function rootMetadata(): Metadata {
  const base = buildPageMetadata({
    title: `${SITE_NAME} | ${SITE_TAGLINE} — House Hunting Across Nigeria`,
    description: DEFAULT_DESCRIPTION,
    path: "/",
    keywords: [
      "house platforms Nigeria",
      "house hunting Lagos",
      "house hunting Abuja",
      "rent in Ogun",
      "rent in Oyo",
      SITE_MASTER_LINE,
    ],
  });

  return {
    ...base,
    title: {
      default: `${SITE_NAME} | ${SITE_TAGLINE} — House Hunting Across Nigeria`,
      template: `%s | ${SITE_NAME}`,
    },
    applicationName: SITE_NAME,
    referrer: "origin-when-cross-origin",
    formatDetection: { telephone: true, email: true, address: true },
    verification: {
      google: "YFCW36GXJfbIq3ujQMa7ELWGPz2KtQsVHO1K4Qpn8AI",
    },
    alternates: {
      ...base.alternates,
      types: {
        "application/rss+xml": absoluteUrl("/feed.xml"),
      },
    },
  };
}
