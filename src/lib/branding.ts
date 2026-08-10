import { connectDB } from "@/lib/db";
import { SiteSettings } from "@/models/SiteSettings";
import { getAuthBackgroundContent } from "@/lib/site-content";
import {
  DEFAULT_BRANDING,
  mergeBranding,
  type BrandingSettings,
} from "@/lib/branding-theme";

export {
  BRAND_FONT_OPTIONS,
  DEFAULT_BRANDING,
  brandingToCssVars,
  cssVarsToInlineStyle,
  googleFontsHref,
  isBrandFont,
  mergeBranding,
  normalizeHex,
  type BrandFontOption,
  type BrandingSettings,
} from "@/lib/branding-theme";

export async function getBranding(): Promise<BrandingSettings> {
  try {
    await connectDB();
    const doc = await SiteSettings.findOne({ key: "global" }).lean();
    const merged = mergeBranding(doc?.branding);

    if (
      !doc?.branding?.authBackgroundUrl ||
      merged.authBackgroundUrl === DEFAULT_BRANDING.authBackgroundUrl
    ) {
      try {
        const legacy = await getAuthBackgroundContent();
        if (
          legacy.imageUrl &&
          legacy.imageUrl !== DEFAULT_BRANDING.authBackgroundUrl
        ) {
          merged.authBackgroundUrl = legacy.imageUrl;
          merged.authBackgroundPublicId = legacy.imagePublicId || "";
        }
      } catch {
        /* ignore */
      }
    }
    return merged;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`getBranding unavailable, using defaults: ${message}`);
    return { ...DEFAULT_BRANDING };
  }
}

export async function updateBranding(
  patch: Partial<BrandingSettings>
): Promise<BrandingSettings> {
  await connectDB();
  const existing = await SiteSettings.findOne({ key: "global" });
  const current = mergeBranding(existing?.branding);
  const next = mergeBranding({ ...current, ...patch });

  await SiteSettings.findOneAndUpdate(
    { key: "global" },
    {
      $set: { branding: next },
      $setOnInsert: { key: "global" },
    },
    { upsert: true, new: true }
  );

  return next;
}
