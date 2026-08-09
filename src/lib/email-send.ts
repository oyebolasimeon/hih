import { connectDB } from "@/lib/db";
import { EmailTemplate, type IEmailTemplate } from "@/models/EmailTemplate";
import {
  BUILTIN_TEMPLATES,
  type EmailAction,
  type TemplateVars,
  htmlToPlainText,
  renderTemplateString,
} from "@/lib/email-templates";
import { sendMail } from "@/lib/smtp";

export type ResolvedEmail = {
  subject: string;
  html: string;
  text: string;
  templateId: string | null;
  source: "action" | "default" | "builtin";
};

function wrapEmailHtml(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f5f2;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f2;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #d5d9ce;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background:#A8BF44;padding:14px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="{{logoUrl}}" width="28" height="28" alt="Nova Elite Homes" style="display:block;border:0;border-radius:4px;width:28px;height:28px;object-fit:contain;" />
                  </td>
                  <td style="vertical-align:middle;font-family:Inter,Arial,sans-serif;font-weight:700;color:#0c0d0b;font-size:15px;">
                    Nova Elite Homes
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 20px;font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#0c0d0b;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 20px;border-top:1px solid #eceee8;font-family:Inter,Arial,sans-serif;font-size:12px;color:#5c6356;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;width:36px;">
                    <img src="{{logoUrl}}" width="32" height="32" alt="Nova Elite Homes" style="display:block;border:0;border-radius:4px;width:32px;height:32px;object-fit:contain;background:#A8BF44;padding:2px;" />
                  </td>
                  <td style="vertical-align:middle;">
                    <div style="font-weight:600;color:#0c0d0b;font-size:13px;">Nova Elite Homes</div>
                    <div style="margin-top:2px;">© {{year}} Nova Elite Homes</div>
                  </td>
                </tr>
              </table>
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

function baseVars(extra: TemplateVars = {}): TemplateVars {
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  return {
    appUrl,
    logoUrl: `${appUrl}/logo.png`,
    loginUrl: `${appUrl}/login`,
    portalUrl: `${appUrl}/portal`,
    adminUrl: `${appUrl}/admin`,
    year: new Date().getFullYear(),
    ...extra,
  };
}

export async function resolveEmailTemplate(
  action: EmailAction,
  vars: TemplateVars = {}
): Promise<ResolvedEmail> {
  await connectDB();

  const actionTemplate = await EmailTemplate.findOne({
    active: true,
    actions: action,
  }).lean<IEmailTemplate | null>();

  let source: ResolvedEmail["source"] = "builtin";
  let subject = BUILTIN_TEMPLATES[action].subject;
  let htmlBody = BUILTIN_TEMPLATES[action].html;
  let templateId: string | null = null;

  if (actionTemplate) {
    source = "action";
    subject = actionTemplate.subject;
    htmlBody = actionTemplate.html;
    templateId = String(actionTemplate._id);
  } else {
    const defaultTemplate = await EmailTemplate.findOne({
      active: true,
      isDefault: true,
    }).lean<IEmailTemplate | null>();

    if (defaultTemplate) {
      source = "default";
      subject = defaultTemplate.subject;
      htmlBody = defaultTemplate.html;
      templateId = String(defaultTemplate._id);
    }
  }

  const merged = baseVars(vars);
  const renderedSubject = renderTemplateString(subject, merged);
  const renderedInner = renderTemplateString(htmlBody, merged);
  // Prefer user HTML as-is if it already looks like a full document; else wrap
  const looksFull = /<html[\s>]/i.test(renderedInner);
  const html = looksFull
    ? renderedInner
    : renderTemplateString(wrapEmailHtml(renderedInner), merged);
  const text = htmlToPlainText(html);

  return { subject: renderedSubject, html, text, templateId, source };
}

export async function sendTemplatedEmail(options: {
  action: EmailAction;
  to: string;
  vars?: TemplateVars;
  /** Skip send when false (e.g. notifications off). Password reset always sends. */
  allowOptOut?: boolean;
  emailNotifications?: boolean | null;
}) {
  if (
    options.allowOptOut &&
    options.emailNotifications === false &&
    options.action !== "password_reset" &&
    options.action !== "email_verify"
  ) {
    return { skipped: true as const };
  }

  const resolved = await resolveEmailTemplate(
    options.action,
    options.vars || {}
  );
  await sendMail({
    to: options.to,
    subject: resolved.subject,
    html: resolved.html,
    text: resolved.text,
  });
  return { skipped: false as const, ...resolved };
}
