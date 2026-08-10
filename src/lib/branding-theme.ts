import {
  BRAND_FONT_OPTIONS,
  DEFAULT_BRANDING,
  type BrandFontOption,
  type BrandingSettings,
} from "@/lib/branding-defaults";

export type { BrandFontOption, BrandingSettings };
export { BRAND_FONT_OPTIONS, DEFAULT_BRANDING };

const HEX = /^#([0-9A-Fa-f]{6})$/;

export function isBrandFont(value: string): value is BrandFontOption {
  return (BRAND_FONT_OPTIONS as readonly string[]).includes(value);
}

export function normalizeHex(input: string, fallback: string): string {
  const v = (input || "").trim();
  if (HEX.test(v)) return v.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(v)) return `#${v.toUpperCase()}`;
  return fallback;
}

export function mergeBranding(
  partial?: Partial<BrandingSettings> | null
): BrandingSettings {
  return {
    logoUrl: (partial?.logoUrl || "").trim(),
    logoPublicId: (partial?.logoPublicId || "").trim(),
    authBackgroundUrl:
      (partial?.authBackgroundUrl || "").trim() ||
      DEFAULT_BRANDING.authBackgroundUrl,
    authBackgroundPublicId: (partial?.authBackgroundPublicId || "").trim(),
    primaryColor: normalizeHex(
      partial?.primaryColor || "",
      DEFAULT_BRANDING.primaryColor
    ),
    secondaryColor: normalizeHex(
      partial?.secondaryColor || "",
      DEFAULT_BRANDING.secondaryColor
    ),
    tertiaryColor: normalizeHex(
      partial?.tertiaryColor || "",
      DEFAULT_BRANDING.tertiaryColor
    ),
    fontUi: isBrandFont(partial?.fontUi || "")
      ? (partial!.fontUi as BrandFontOption)
      : DEFAULT_BRANDING.fontUi,
    fontDisplay: isBrandFont(partial?.fontDisplay || "")
      ? (partial!.fontDisplay as BrandFontOption)
      : DEFAULT_BRANDING.fontDisplay,
    appName: (partial?.appName || "").trim() || DEFAULT_BRANDING.appName,
  };
}

/** CSS custom properties for light theme rooted on admin colors */
export function brandingToCssVars(b: BrandingSettings): Record<string, string> {
  const primary = b.primaryColor;
  const secondary = b.secondaryColor;
  const tertiary = b.tertiaryColor;

  return {
    "--navy": primary,
    "--navy-deep": `color-mix(in srgb, ${primary} 85%, black)`,
    "--teal": secondary,
    "--teal-dark": `color-mix(in srgb, ${secondary} 82%, black)`,
    "--teal-light": `color-mix(in srgb, ${secondary} 75%, white)`,
    "--sand": tertiary,
    "--sand-deep": `color-mix(in srgb, ${tertiary} 88%, ${primary})`,
    "--background": tertiary,
    "--foreground": primary,
    "--brand": secondary,
    "--brand-light": `color-mix(in srgb, ${secondary} 75%, white)`,
    "--brand-dark": `color-mix(in srgb, ${secondary} 82%, black)`,
    "--brand-subtle": `color-mix(in srgb, ${secondary} 18%, ${tertiary})`,
    "--surface": `color-mix(in srgb, ${tertiary} 92%, white)`,
    "--surface-dark": `color-mix(in srgb, ${tertiary} 88%, ${primary})`,
    "--muted": `color-mix(in srgb, ${primary} 45%, #7a8594)`,
    "--border": `color-mix(in srgb, ${tertiary} 70%, ${primary})`,
    "--border-dark": `color-mix(in srgb, ${tertiary} 55%, ${primary})`,
    "--card": "#ffffff",
    "--font-ui": `"${b.fontUi}", system-ui, sans-serif`,
    "--font-display-face": `"${b.fontDisplay}", Georgia, serif`,
    "--font-display": `"${b.fontDisplay}", Georgia, serif`,
    "--font-sans": `"${b.fontUi}", system-ui, sans-serif`,
  };
}

export function googleFontsHref(b: BrandingSettings): string {
  const families = [...new Set([b.fontUi, b.fontDisplay])];
  const spec = families
    .map(
      (f) =>
        `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@400;500;600;700`
    )
    .join("&");
  return `https://fonts.googleapis.com/css2?${spec}&display=swap`;
}

export function cssVarsToInlineStyle(vars: Record<string, string>): string {
  return Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";");
}
