import {
  escapeHtml,
  renderTemplateString,
  type TemplateVars,
} from "@/lib/email-templates";

function appBaseUrl() {
  return (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

function absoluteAssetUrl(pathOrUrl: string, appUrl: string) {
  const value = (pathOrUrl || "").trim();
  if (!value) return `${appUrl}/logo-email.png`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${appUrl}${value.startsWith("/") ? value : `/${value}`}`;
}

/** Sync defaults — emails prefer the white-backed mark for dark headers. */
export function emailBaseVars(extra: TemplateVars = {}): TemplateVars {
  const appUrl = appBaseUrl();
  return {
    appUrl,
    logoUrl: `${appUrl}/logo-email.png`,
    loginUrl: `${appUrl}/login`,
    portalUrl: `${appUrl}/portal`,
    adminUrl: `${appUrl}/admin`,
    year: new Date().getFullYear(),
    supportEmail: "houseinhandsmail@gmail.com",
    ...extra,
  };
}

/** Prefer admin branding logo when set; otherwise email-optimized default. */
export async function resolveEmailBaseVars(
  extra: TemplateVars = {}
): Promise<TemplateVars> {
  const appUrl = appBaseUrl();
  let logoUrl = `${appUrl}/logo-email.png`;
  try {
    const { getBranding } = await import("@/lib/branding");
    const branding = await getBranding();
    if (branding.logoUrl?.trim()) {
      // Custom uploads are usually transparent — use as-is.
      // Built-in default `/logo.png` → use email-optimized sibling.
      const raw = branding.logoUrl.trim();
      logoUrl =
        raw === "/logo.png" || raw.endsWith("/logo.png")
          ? `${appUrl}/logo-email.png`
          : absoluteAssetUrl(raw, appUrl);
    }
  } catch {
    /* keep default */
  }
  return emailBaseVars({ ...extra, logoUrl });
}

/** Branded shell applied to all outgoing HTML emails unless marked full-layout. */
export function wrapEmailHtml(innerBody: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>House In Hands</title>
</head>
<body style="margin:0;padding:0;background:#E8D9C0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#E8D9C0;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #D4C4AE;border-radius:8px;overflow:hidden;box-shadow:0 8px 32px rgba(11,31,58,0.08);">
          <tr>
            <td style="background:#0B1F3A;padding:22px 24px;border-bottom:3px solid #008585;">
              <table role="presentation" cellspacing="0" cellpadding="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;width:48px;padding-right:14px;">
                    <img src="{{logoUrl}}" width="44" height="44" alt="House In Hand" style="display:block;border:0;border-radius:8px;width:44px;height:44px;object-fit:contain;" />
                  </td>
                  <td style="vertical-align:middle;font-family:Georgia,'Times New Roman',serif;font-weight:600;color:#F4E9D8;font-size:18px;letter-spacing:-0.02em;">
                    House In Hands
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#0B1F3A;">
              ${innerBody}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px;border-top:1px solid #E0D4C2;background:#FAF6EF;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#5A6A7D;">
              <div style="font-weight:600;color:#0B1F3A;font-size:13px;margin-bottom:6px;">House In Hands</div>
              <div>Housing you can trust — Property. In Your Hands.</div>
              <div style="margin-top:10px;">
                <a href="{{portalUrl}}" style="color:#008585;text-decoration:none;">Open portal</a>
                <span style="color:#C4B8A8;"> · </span>
                <a href="mailto:{{supportEmail}}" style="color:#008585;text-decoration:none;">{{supportEmail}}</a>
              </div>
              <div style="margin-top:12px;color:#8A9AAD;font-size:11px;">© {{year}} House In Hands. All rights reserved.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function emailButton(href: string, label: string): string {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  return `
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 4px;">
  <tr>
    <td style="border-radius:6px;background:#008585;">
      <a href="${safeHref}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
        ${safeLabel}
      </a>
    </td>
  </tr>
</table>`.trim();
}

export function notificationEmailBody(input: {
  body: string;
  name?: string;
  link?: string;
  linkLabel?: string;
}): string {
  const appUrl = appBaseUrl();
  const greeting = input.name
    ? `Hi ${escapeHtml(input.name)},`
    : "Hi,";
  const fullLink = input.link
    ? input.link.startsWith("http")
      ? input.link
      : `${appUrl}${input.link.startsWith("/") ? input.link : `/${input.link}`}`
    : "";

  return `
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 24px;">${escapeHtml(input.body)}</p>
${fullLink ? emailButton(fullLink, input.linkLabel || "Open in House In Hands") : ""}
`.trim();
}

export async function buildBrandedEmail(
  innerBody: string,
  vars: TemplateVars = {}
): Promise<string> {
  const merged = await resolveEmailBaseVars(vars);
  const renderedInner = renderTemplateString(innerBody, merged);
  return renderTemplateString(wrapEmailHtml(renderedInner), merged);
}

export function isFullLayoutEmail(html: string): boolean {
  return /<!--\s*hih:full\s*-->/i.test(html) || /<html[\s>]/i.test(html);
}

export async function resolveBrandedEmailHtml(
  innerBody: string,
  vars: TemplateVars = {}
): Promise<string> {
  if (isFullLayoutEmail(innerBody)) {
    const merged = await resolveEmailBaseVars(vars);
    return renderTemplateString(innerBody, merged);
  }
  return buildBrandedEmail(innerBody, vars);
}
