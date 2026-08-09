import { sendTemplatedEmail } from "@/lib/email-send";
export { sendMail } from "@/lib/smtp";

export async function sendWelcomeEmail(to: string, name: string) {
  await sendTemplatedEmail({
    action: "welcome",
    to,
    vars: { name, email: to },
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
