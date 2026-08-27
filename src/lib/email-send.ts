import { connectDB } from "@/lib/db";
import { EmailTemplate, type IEmailTemplate } from "@/models/EmailTemplate";
import {
  BUILTIN_TEMPLATES,
  type EmailAction,
  type TemplateVars,
  htmlToPlainText,
  renderTemplateString,
} from "@/lib/email-templates";
import {
  emailBaseVars,
  resolveBrandedEmailHtml,
} from "@/lib/email-layout";
import { sendMail } from "@/lib/smtp";

export type ResolvedEmail = {
  subject: string;
  html: string;
  text: string;
  templateId: string | null;
  source: "action" | "default" | "builtin";
};

const AUTH_ACTIONS_NO_DEFAULT_FALLBACK: EmailAction[] = [
  "email_verify",
  "password_reset",
];

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
  } else if (!AUTH_ACTIONS_NO_DEFAULT_FALLBACK.includes(action)) {
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

  const merged = emailBaseVars(vars);
  const renderedSubject = renderTemplateString(subject, merged);
  const renderedInner = renderTemplateString(htmlBody, merged);
  const html = resolveBrandedEmailHtml(renderedInner, merged);
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

export { isFullLayoutEmail, resolveBrandedEmailHtml, buildBrandedEmail } from "@/lib/email-layout";
