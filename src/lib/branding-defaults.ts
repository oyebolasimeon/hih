/** Browser-safe branding constants — do not import mongoose here */

export const BRAND_FONT_OPTIONS = [
  "Manrope",
  "Outfit",
  "DM Sans",
  "Plus Jakarta Sans",
  "Sora",
  "Space Grotesk",
  "Inter",
  "Fraunces",
  "Playfair Display",
  "Libre Baskerville",
  "Source Serif 4",
  "Literata",
  "Lora",
] as const;

export type BrandFontOption = (typeof BRAND_FONT_OPTIONS)[number];

export const DEFAULT_BRANDING = {
  logoUrl: "",
  logoPublicId: "",
  authBackgroundUrl: "/hero-home.jpg",
  authBackgroundPublicId: "",
  primaryColor: "#0B1F3A",
  secondaryColor: "#00A6A6",
  tertiaryColor: "#F4E9D8",
  fontUi: "Manrope" as BrandFontOption,
  fontDisplay: "Fraunces" as BrandFontOption,
  appName: "House In Hand",
};

export type BrandingSettings = typeof DEFAULT_BRANDING;
