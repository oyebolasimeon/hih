import { sendTemplatedEmail } from "@/lib/email-send";
import { buildBrandedEmail } from "@/lib/email-layout";
import { escapeHtml, htmlToPlainText } from "@/lib/email-templates";
import { sendMail as deliverMail } from "@/lib/smtp";

export { sendMail } from "@/lib/smtp";

export async function sendBrandedMail(options: {
  to: string;
  subject: string;
  htmlBody: string;
  text?: string;
}) {
  const html = buildBrandedEmail(options.htmlBody);
  await deliverMail({
    to: options.to,
    subject: options.subject,
    html,
    text: options.text || htmlToPlainText(html),
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  await sendTemplatedEmail({
    action: "welcome",
    to,
    vars: { name, email: to },
  });
}

export async function sendVerificationEmail(
  to: string,
  token: string,
  name = ""
) {
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const verifyUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`;
  await sendTemplatedEmail({
    action: "email_verify",
    to,
    vars: { name: name || to, email: to, verifyUrl },
  });
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
  name = ""
) {
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendTemplatedEmail({
    action: "password_reset",
    to,
    vars: { name: name || to, email: to, resetUrl },
  });
}

export async function sendAdminInviteEmail(options: {
  to: string;
  name: string;
  role: string;
}) {
  await sendTemplatedEmail({
    action: "admin_invite",
    to: options.to,
    vars: {
      name: options.name,
      email: options.to,
      role: options.role,
    },
  });
}

export async function sendPortfolioUpdateEmail(options: {
  to: string;
  name: string;
  emailNotifications?: boolean | null;
}) {
  return sendTemplatedEmail({
    action: "portfolio_update",
    to: options.to,
    vars: { name: options.name, email: options.to },
    allowOptOut: true,
    emailNotifications: options.emailNotifications,
  });
}

export function shouldSendAccountEmail(emailNotifications?: boolean | null) {
  return emailNotifications !== false;
}

export async function sendAdminMessageEmail(options: {
  to: string;
  name: string;
  subject: string;
  message: string;
}) {
  const messageBody = escapeHtml(options.message).replace(/\n/g, "<br>");
  return sendTemplatedEmail({
    action: "admin_message",
    to: options.to,
    vars: {
      name: options.name,
      email: options.to,
      messageSubject: options.subject,
      messageBody,
    },
  });
}
