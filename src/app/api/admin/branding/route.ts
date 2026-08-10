import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import {
  BRAND_FONT_OPTIONS,
  DEFAULT_BRANDING,
  type BrandingSettings,
} from "@/lib/branding-defaults";
import {
  getBranding,
  isBrandFont,
  normalizeHex,
  updateBranding,
} from "@/lib/branding";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { uploadImageBuffer } from "@/lib/cloudinary";

export async function GET() {
  const { response } = await assertAdmin("content:read");
  if (response) return response;
  const branding = await getBranding();
  return NextResponse.json({
    branding,
    defaults: DEFAULT_BRANDING,
    fontOptions: BRAND_FONT_OPTIONS,
  });
}

const patchSchema = z.object({
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  tertiaryColor: z.string().optional(),
  fontUi: z.string().optional(),
  fontDisplay: z.string().optional(),
  appName: z.string().trim().min(1).max(80).optional(),
  clearLogo: z.boolean().optional(),
  clearAuthBackground: z.boolean().optional(),
});

export async function PATCH(req: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid branding payload." }, { status: 400 });
  }

  const patch: Partial<BrandingSettings> = {};
  if (parsed.data.primaryColor) {
    patch.primaryColor = normalizeHex(
      parsed.data.primaryColor,
      DEFAULT_BRANDING.primaryColor
    );
  }
  if (parsed.data.secondaryColor) {
    patch.secondaryColor = normalizeHex(
      parsed.data.secondaryColor,
      DEFAULT_BRANDING.secondaryColor
    );
  }
  if (parsed.data.tertiaryColor) {
    patch.tertiaryColor = normalizeHex(
      parsed.data.tertiaryColor,
      DEFAULT_BRANDING.tertiaryColor
    );
  }
  if (parsed.data.fontUi) {
    if (!isBrandFont(parsed.data.fontUi)) {
      return NextResponse.json({ error: "Unsupported UI font." }, { status: 400 });
    }
    patch.fontUi = parsed.data.fontUi;
  }
  if (parsed.data.fontDisplay) {
    if (!isBrandFont(parsed.data.fontDisplay)) {
      return NextResponse.json({ error: "Unsupported display font." }, { status: 400 });
    }
    patch.fontDisplay = parsed.data.fontDisplay;
  }
  if (parsed.data.appName) patch.appName = parsed.data.appName;

  if (parsed.data.clearLogo) {
    patch.logoUrl = "";
    patch.logoPublicId = "";
  }
  if (parsed.data.clearAuthBackground) {
    patch.authBackgroundUrl = DEFAULT_BRANDING.authBackgroundUrl;
    patch.authBackgroundPublicId = "";
  }

  const branding = await updateBranding(patch);

  await writeAudit({
    action: "branding.update",
    summary: "Updated app branding settings",
    actor: actorFromUser({ ...user, isAdmin: true }),
    entityType: "site_settings",
    entityId: "global",
    metadata: parsed.data,
  });

  return NextResponse.json({ branding });
}

export async function POST(req: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form." }, { status: 400 });
  }

  const kind = String(form.get("kind") || "").trim();
  if (kind !== "logo" && kind !== "authBackground") {
    return NextResponse.json(
      { error: "kind must be logo or authBackground." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Max 5MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const folder =
    kind === "logo" ? "house-in-hand/branding/logo" : "house-in-hand/branding/auth";

  let uploaded: { url: string; publicId: string };
  try {
    uploaded = await uploadImageBuffer(buffer, folder);
  } catch (err) {
    console.error("Branding upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Check Cloudinary configuration." },
      { status: 502 }
    );
  }

  const branding = await updateBranding(
    kind === "logo"
      ? { logoUrl: uploaded.url, logoPublicId: uploaded.publicId }
      : {
          authBackgroundUrl: uploaded.url,
          authBackgroundPublicId: uploaded.publicId,
        }
  );

  await writeAudit({
    action: kind === "logo" ? "branding.logo_upload" : "branding.auth_bg_upload",
    summary: `Uploaded branding ${kind}`,
    actor: actorFromUser({ ...user, isAdmin: true }),
    entityType: "site_settings",
    entityId: "global",
  });

  return NextResponse.json({ branding });
}
