import {
  SITE_CONTACT,
  SITE_LEGAL_NAME,
  SITE_MASTER_LINE,
  SITE_NAME,
  SITE_SOCIAL_SAME_AS,
  SITE_TAGLINE,
  getSiteUrl,
} from "@/lib/seo/site";

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  const url = getSiteUrl();
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_LEGAL_NAME,
        legalName: SITE_LEGAL_NAME,
        alternateName: ["HIH", "HouseInHands", "House in Hands"],
        url,
        logo: `${url}/logo.png`,
        description: `${SITE_TAGLINE}. ${SITE_MASTER_LINE}`,
        email: SITE_CONTACT.email,
        telephone: SITE_CONTACT.phone,
        areaServed: {
          "@type": "Country",
          name: "Nigeria",
        },
        sameAs: SITE_SOCIAL_SAME_AS,
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: SITE_CONTACT.phone,
            contactType: "customer service",
            areaServed: "NG",
            availableLanguage: ["English"],
          },
        ],
      }}
    />
  );
}

export function WebsiteJsonLd() {
  const url = getSiteUrl();
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url,
        description: SITE_TAGLINE,
        inLanguage: "en-NG",
        potentialAction: {
          "@type": "SearchAction",
          target: `${url}/listings?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function ListingJsonLd(input: {
  id: string;
  title: string;
  description: string;
  image?: string;
  price: number;
  currency: string;
  period: string;
  street: string;
  city: string;
  state: string;
  country?: string;
}) {
  const url = `${getSiteUrl()}/listings/${input.id}`;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        name: input.title,
        description: input.description.slice(0, 500),
        url,
        image: input.image ? [input.image] : undefined,
        datePosted: new Date().toISOString(),
        offers: {
          "@type": "Offer",
          price: input.price,
          priceCurrency: input.currency || "NGN",
          availability: "https://schema.org/InStock",
          description: `Rent ${input.period}`,
        },
        address: {
          "@type": "PostalAddress",
          streetAddress: input.street,
          addressLocality: input.city,
          addressRegion: input.state,
          addressCountry: input.country || "NG",
        },
      }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: Array<{ name: string; path: string }>;
}) {
  const url = getSiteUrl();
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: `${url}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
        })),
      }}
    />
  );
}
