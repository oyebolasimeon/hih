export const EMAIL_ACTIONS = [
  "welcome",
  "email_verify",
  "password_reset",
  "admin_invite",
  "portfolio_update",
  "admin_message",
] as const;

export type EmailAction = (typeof EMAIL_ACTIONS)[number];

export const EMAIL_ACTION_LABELS: Record<EmailAction, string> = {
  welcome: "Welcome / account created",
  email_verify: "Verify email address",
  password_reset: "Password reset",
  admin_invite: "Admin invited / access granted",
  portfolio_update: "Portfolio / performance update",
  admin_message: "Admin message to user",
};

export const EMAIL_ACTION_DESCRIPTIONS: Record<EmailAction, string> = {
  welcome: "Sent after an investor verifies their email (or when admins invite).",
  email_verify: "Sent when a new user registers — contains the verify link.",
  password_reset: "Sent when someone requests a password reset link.",
  admin_invite: "Sent when an admin is added on Team & RBAC.",
  portfolio_update: "Used when admins send a account update from the console.",
  admin_message: "Sent when an admin emails a user from Users management.",
};

/** Placeholders available in subject + body (HTML or text). */
export const EMAIL_VARIABLES = [
  { key: "{{name}}", label: "Recipient name" },
  { key: "{{email}}", label: "Recipient email" },
  { key: "{{appUrl}}", label: "App base URL" },
  { key: "{{logoUrl}}", label: "House In Hand logo URL" },
  { key: "{{loginUrl}}", label: "Login page URL" },
  { key: "{{portalUrl}}", label: "App URL" },
  { key: "{{resetUrl}}", label: "Password reset URL (reset emails)" },
  { key: "{{verifyUrl}}", label: "Email verification URL" },
  { key: "{{adminUrl}}", label: "Admin console URL" },
  { key: "{{role}}", label: "Admin role (invite emails)" },
  { key: "{{messageSubject}}", label: "Custom subject (admin messages)" },
  { key: "{{messageBody}}", label: "Custom message body (admin messages)" },
  { key: "{{year}}", label: "Current year" },
] as const;

export type TemplateVars = Record<string, string | number | undefined | null>;

export function renderTemplateString(input: string, vars: TemplateVars): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = vars[key];
    return value == null ? "" : String(value);
  });
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    <p>This is a message from House In Hand.</p>
    <p><a href="{{loginUrl}}" style="color:#008585;">Sign in to your account</a></p>
    <p>— House In Hand</p>
  </div>
`.trim();

export const BUILTIN_TEMPLATES: Record<
  EmailAction | "default",
  { subject: string; html: string }
> = {
  default: {
    subject: "Message from House In Hand",
    html: BUILTIN_DEFAULT_HTML,
  },
  welcome: {
    subject: "Welcome to House In Hand",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0c0d0b;">
        <p>Hi {{name}},</p>
        <p>Welcome to House In Hand. Your account is verified and ready.</p>
        <p><a href="{{loginUrl}}" style="color:#008585;font-weight:600;">Sign in to your portal</a></p>
        <p>Our team will complete your portfolio onboarding shortly.</p>
        <p>— House In Hand</p>
      </div>
    `.trim(),
  },
  email_verify: {
    subject: "Verify your House In Hand email",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0c0d0b;">
        <p>Hi {{name}},</p>
        <p>Thanks for creating a House In Hand account. Please verify your email to continue.</p>
        <p><a href="{{verifyUrl}}" style="color:#008585;font-weight:600;">Verify email address</a></p>
        <p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
        <p>— House In Hand</p>
      </div>
    `.trim(),
  },
  password_reset: {
    subject: "Reset your House In Hand password",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0c0d0b;">
        <p>Hi {{name}},</p>
        <p>You requested a password reset for your House In Hand account.</p>
        <p><a href="{{resetUrl}}" style="color:#008585;font-weight:600;">Reset password</a></p>
        <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
        <p>— House In Hand</p>
      </div>
    `.trim(),
  },
  admin_invite: {
    subject: "You've been added as a House In Hand admin",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0c0d0b;">
        <p>Hi {{name}},</p>
        <p>You've been granted <strong>{{role}}</strong> access to the House In Hand admin console.</p>
        <p><a href="{{adminUrl}}" style="color:#008585;font-weight:600;">Open admin console</a></p>
        <p>— House In Hand</p>
      </div>
    `.trim(),
  },
  portfolio_update: {
    subject: "Your House In Hand account update",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0c0d0b;">
        <p>Hi {{name}},</p>
        <p>Here's an update on your House In Hand portfolio.</p>
        <p><a href="{{portalUrl}}" style="color:#008585;font-weight:600;">View your portal</a></p>
        <p>— House In Hand</p>
      </div>
    `.trim(),
  },
  admin_message: {
    subject: "{{messageSubject}}",
    html: `
      <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0c0d0b;">
        <p>Hi {{name}},</p>
        <div>{{messageBody}}</div>
        <p style="margin-top:20px;"><a href="{{portalUrl}}" style="color:#008585;font-weight:600;">Open House In Hand</a></p>
        <p>— House In Hand</p>
      </div>
    `.trim(),
  },
};
