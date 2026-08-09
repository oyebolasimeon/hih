export const EMAIL_ACTIONS = [
  "welcome",
  "password_reset",
  "admin_invite",
  "portfolio_update",
] as const;

export type EmailAction = (typeof EMAIL_ACTIONS)[number];

export const EMAIL_ACTION_LABELS: Record<EmailAction, string> = {
  welcome: "Investor welcome / account created",
  password_reset: "Password reset",
  admin_invite: "Admin invited / access granted",
  portfolio_update: "Portfolio / performance update",
};

export const EMAIL_ACTION_DESCRIPTIONS: Record<EmailAction, string> = {
  welcome: "Sent when a new investor registers.",
  password_reset: "Sent when someone requests a password reset link.",
  admin_invite: "Sent when an admin is added on Team & RBAC.",
  portfolio_update: "Used when admins send a portfolio update from the console.",
};

/** Placeholders available in subject + body (HTML or text). */
export const EMAIL_VARIABLES = [
  { key: "{{name}}", label: "Recipient name" },
  { key: "{{email}}", label: "Recipient email" },
  { key: "{{appUrl}}", label: "App base URL" },
  { key: "{{loginUrl}}", label: "Login page URL" },
  { key: "{{portalUrl}}", label: "Investor portal URL" },
  { key: "{{resetUrl}}", label: "Password reset URL (reset emails)" },
  { key: "{{adminUrl}}", label: "Admin console URL" },
  { key: "{{role}}", label: "Admin role (invite emails)" },
  { key: "{{year}}", label: "Current year" },
] as const;

export type TemplateVars = Record<string, string | number | undefined | null>;

export function renderTemplateString(input: string, vars: TemplateVars): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value == null ? "" : String(value);
  });
}

export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const BUILTIN_DEFAULT_HTML = `
  <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0c0d0b;">
    <p>Hi {{name}},</p>
    <p>This is a message from Nova Elite Homes.</p>
    <p><a href="{{loginUrl}}" style="color:#8FA63A;">Sign in to your account</a></p>
    <p>— Nova Elite Homes</p>
  </div>
`.trim();

export const BUILTIN_TEMPLATES: Record<
  EmailAction | "default",
  { subject: string; html: string }
> = {
  default: {
    subject: "Message from Nova Elite Homes",
    html: BUILTIN_DEFAULT_HTML,
  },
  welcome: {
    subject: "Welcome to Nova Elite Homes",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0c0d0b;">
        <p>Hi {{name}},</p>
        <p>Welcome to Nova Elite Homes. Your investor account has been created.</p>
        <p><a href="{{loginUrl}}" style="color:#8FA63A;font-weight:600;">Sign in to your portal</a></p>
        <p>Our team will complete your portfolio onboarding shortly.</p>
        <p>— Nova Elite Homes</p>
      </div>
    `.trim(),
  },
  password_reset: {
    subject: "Reset your Nova Elite Homes password",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0c0d0b;">
        <p>Hi {{name}},</p>
        <p>You requested a password reset for your Nova Elite Homes account.</p>
        <p><a href="{{resetUrl}}" style="color:#8FA63A;font-weight:600;">Reset password</a></p>
        <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
        <p>— Nova Elite Homes</p>
      </div>
    `.trim(),
  },
  admin_invite: {
    subject: "You've been added as a Nova Elite admin",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0c0d0b;">
        <p>Hi {{name}},</p>
        <p>You've been granted <strong>{{role}}</strong> access to the Nova Elite Homes admin console.</p>
        <p><a href="{{adminUrl}}" style="color:#8FA63A;font-weight:600;">Open admin console</a></p>
        <p>— Nova Elite Homes</p>
      </div>
    `.trim(),
  },
  portfolio_update: {
    subject: "Your Nova Elite portfolio update",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0c0d0b;">
        <p>Hi {{name}},</p>
        <p>Here's an update on your Nova Elite Homes portfolio.</p>
        <p><a href="{{portalUrl}}" style="color:#8FA63A;font-weight:600;">View your portal</a></p>
        <p>— Nova Elite Homes</p>
      </div>
    `.trim(),
  },
};
