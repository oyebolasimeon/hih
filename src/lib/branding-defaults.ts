/** Browser-safe branding constants — aligned to House In Hands Brand Identity Guidelines */

/**
 * Inter is the brand system typeface (one family, weight hierarchy).
 * Other faces remain selectable in Admin for experiments; production default is Inter.
 */
export const BRAND_FONT_OPTIONS = [
  "Inter",
  "Manrope",
  "Outfit",
  "DM Sans",
  "Plus Jakarta Sans",
  "Sora",
  "Space Grotesk",
  "Fraunces",
  "Playfair Display",
  "Libre Baskerville",
  "Source Serif 4",
  "Literata",
  "Lora",
] as const;

export type BrandFontOption = (typeof BRAND_FONT_OPTIONS)[number];

/** Core palette from Brand Identity Guidelines § Colour System */
export const BRAND_COLORS = {
  navy: "#0B1F3A",
  teal: "#00A6A6",
  sand: "#F4E9D8",
  white: "#FFFFFF",
  slate: "#475569",
  gold: "#C9A35B",
} as const;

/** Master brand line — does not change by audience */
export const BRAND_MASTER_LINE = "Property. In Your Hands.";

export const DEFAULT_BRANDING = {
  logoUrl: "/logo.png",
  logoPublicId: "",
  authBackgroundUrl: "/hero-home.jpg",
  authBackgroundPublicId: "",
  primaryColor: BRAND_COLORS.navy as string,
  secondaryColor: BRAND_COLORS.teal as string,
  tertiaryColor: BRAND_COLORS.sand as string,
  fontUi: "Inter" as BrandFontOption,
  fontDisplay: "Inter" as BrandFontOption,
  appName: "House In Hands",
};

export type BrandingSettings = {
  logoUrl: string;
  logoPublicId: string;
  authBackgroundUrl: string;
  authBackgroundPublicId: string;
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  fontUi: BrandFontOption;
  fontDisplay: BrandFontOption;
  appName: string;
};
