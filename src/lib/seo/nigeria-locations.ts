export type SeoLocation = {
  slug: string;
  name: string;
  /** Value used on listings.address.state */
  stateMatch: string;
  /** Optional city filter for metro landing pages */
  cityMatch?: string;
  title: string;
  description: string;
  keywords: string[];
};

const STATE_NAMES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "FCT",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Lagos",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
] as const;

function slugify(name: string) {
  if (name === "FCT") return "abuja";
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-");
}

function displayName(name: string) {
  return name === "FCT" ? "Abuja (FCT)" : name;
}

/** Priority hubs ranked first in internal linking */
export const PRIORITY_LOCATION_SLUGS = [
  "lagos",
  "abuja",
  "ogun",
  "oyo",
  "rivers",
  "kano",
  "kaduna",
  "enugu",
  "edo",
  "delta",
] as const;

/** High-intent SEO overrides for competitive state queries */
const LOCATION_SEO_OVERRIDES: Partial<
  Record<string, Pick<SeoLocation, "title" | "description" | "keywords">>
> = {
  lagos: {
    title:
      "House Hunting Websites in Lagos | Verified Homes for Rent | House In Hands",
    description:
      "Looking for house hunting websites in Lagos? House In Hands is a trusted property platform for verified rentals in Lekki, Ikeja, VI, Yaba, Surulere and across Lagos — clearer costs, direct landlords and digital tenancy.",
    keywords: [
      "house hunting websites in Lagos",
      "house hunting websites Lagos",
      "best house hunting website Lagos",
      "house hunting Lagos Nigeria",
      "rent apartment Lagos",
      "verified landlords Lagos",
      "property platform Lagos",
      "find house Lagos without agent",
      "houses for rent Lekki Ikeja",
    ],
  },
  abuja: {
    title:
      "House Hunting Websites in Abuja | Verified Rentals | House In Hands",
    description:
      "House hunting websites in Abuja? Use House In Hands for verified apartments and houses across Gwarinpa, Wuse, Maitama and the FCT — clearer listings and digital rent tools.",
    keywords: [
      "house hunting websites in Abuja",
      "house hunting Abuja",
      "rent apartment Abuja",
      "property platform Abuja",
    ],
  },
  ogun: {
    title: "House Hunting in Ogun State | Abeokuta & Beyond | House In Hands",
    description:
      "House hunting in Ogun State on House In Hands — verified homes in Abeokuta and across Ogun with clearer costs and digital applications.",
    keywords: [
      "house hunting Ogun",
      "house hunting websites Ogun",
      "rent house Abeokuta",
    ],
  },
  oyo: {
    title: "House Hunting in Oyo & Ibadan | Verified Rentals | House In Hands",
    description:
      "House hunting in Oyo State and Ibadan on House In Hands — verified rentals, clearer pricing and digital tenancy tools.",
    keywords: [
      "house hunting Oyo",
      "house hunting Ibadan",
      "rent apartment Ibadan",
    ],
  },
};

const STATE_LOCATIONS: SeoLocation[] = STATE_NAMES.map((state) => {
  const name = displayName(state);
  const slug = slugify(state);
  const override = LOCATION_SEO_OVERRIDES[slug];
  return {
    slug,
    name,
    stateMatch: state === "FCT" ? "FCT" : state,
    title:
      override?.title ||
      `House Hunting in ${name}, Nigeria | Rent & Verified Homes | House In Hands`,
    description:
      override?.description ||
      `Find verified houses, apartments and hostels for rent in ${name}, Nigeria. House hunting made clearer on House In Hands — connect with landlords, apply digitally and manage rent in one trusted property platform.`,
    keywords: override?.keywords || [
      `house hunting ${name}`,
      `house hunting websites ${name}`,
      `rent house ${name}`,
      `apartment for rent ${name}`,
      `houses for rent ${name} Nigeria`,
      `property platform ${name}`,
      `verified landlords ${name}`,
      `student hostel ${name}`,
      `houseinhands ${name}`,
    ],
  };
});

/** High-intent city / area pages that expand Nigeria SEO coverage */
const CITY_SEED: Array<{ city: string; state: string }> = [
  { city: "Lekki", state: "Lagos" },
  { city: "Ikeja", state: "Lagos" },
  { city: "Victoria Island", state: "Lagos" },
  { city: "Yaba", state: "Lagos" },
  { city: "Surulere", state: "Lagos" },
  { city: "Ajah", state: "Lagos" },
  { city: "Ikorodu", state: "Lagos" },
  { city: "Gwarinpa", state: "FCT" },
  { city: "Wuse", state: "FCT" },
  { city: "Maitama", state: "FCT" },
  { city: "Kubwa", state: "FCT" },
  { city: "Ibadan", state: "Oyo" },
  { city: "Abeokuta", state: "Ogun" },
  { city: "Port Harcourt", state: "Rivers" },
  { city: "Enugu", state: "Enugu" },
  { city: "Benin City", state: "Edo" },
  { city: "Kano", state: "Kano" },
  { city: "Kaduna", state: "Kaduna" },
];

const CITY_LOCATIONS: SeoLocation[] = CITY_SEED.map(({ city, state }) => {
  const stateName = displayName(state);
  const slug = slugify(city);
  return {
    slug,
    name: city,
    stateMatch: state,
    cityMatch: city,
    title: `House Hunting in ${city}, ${stateName} | Rent Homes | House In Hands`,
    description: `House hunting in ${city}, ${stateName}, Nigeria. Browse verified apartments and houses for rent on House In Hands — clearer listings, digital applications and trusted property tools.`,
    keywords: [
      `house hunting ${city}`,
      `rent house ${city}`,
      `apartment for rent ${city} ${stateName}`,
      `houses for rent ${city} Nigeria`,
      `property platform ${city}`,
    ],
  };
});

export const NIGERIA_SEO_LOCATIONS: SeoLocation[] = [
  ...STATE_LOCATIONS,
  ...CITY_LOCATIONS.filter(
    (city) => !STATE_LOCATIONS.some((state) => state.slug === city.slug)
  ),
];

export function getLocationBySlug(slug: string) {
  return NIGERIA_SEO_LOCATIONS.find((l) => l.slug === slug) || null;
}

/** Mongo filter for a location landing page (state and optional city). */
export function listingFilterForLocation(loc: SeoLocation) {
  const stateValues =
    loc.stateMatch === "FCT" || loc.slug === "abuja"
      ? ["FCT", "Abuja", "Federal Capital Territory"]
      : [loc.stateMatch];

  const filter: Record<string, unknown> = {
    availabilityStatus: { $in: ["available", "pending"] },
    verificationStatus: "verified",
    "address.state": { $in: stateValues },
  };

  if (loc.cityMatch) {
    filter["address.city"] = new RegExp(`^${loc.cityMatch}$`, "i");
  }

  return filter;
}

export function getPriorityLocations() {
  return PRIORITY_LOCATION_SLUGS.map((slug) => getLocationBySlug(slug)).filter(
    Boolean
  ) as SeoLocation[];
}
