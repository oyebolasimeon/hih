import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.GOOGLE_SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.GOOGLE_SMTP_PORT || 587);
  const user = process.env.GOOGLE_SMTP_USER;
  // Support both GOOGLE_SMTP_PASSWORD (preferred) and legacy GOOGLE_SMTP_PASS
  const rawPass =
    process.env.GOOGLE_SMTP_PASSWORD || process.env.GOOGLE_SMTP_PASS;
  const pass = rawPass?.replace(/\s+/g, "");

  if (!user || !pass) {
    throw new Error("Google SMTP credentials are not configured");
  }

  const secureEnv = process.env.GOOGLE_SMTP_SECURE;
  const secure =
    secureEnv != null
      ? secureEnv === "true" || secureEnv === "1"
      : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const from =
    process.env.GOOGLE_SMTP_FROM ||
    process.env.GOOGLE_SMTP_USER ||
    "noreply@novaelitehomes.co.uk";

  const transporter = getTransporter();
  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function sendWelcomeEmail(to: string, name: string) {
  const appUrl = process.env.AUTH_URL || "http://localhost:3000";
  await sendMail({
    to,
    subject: "Welcome to Nova Elite Homes",
    text: `Hi ${name}, your investor account is ready. Sign in at ${appUrl}/login`,
    html: `
      <p>Hi ${name},</p>
      <p>Welcome to Nova Elite Homes. Your investor account has been created.</p>
      <p><a href="${appUrl}/login">Sign in to your portal</a></p>
      <p>Our team will complete your portfolio onboarding shortly.</p>
      <p>— Nova Elite Homes</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const appUrl = process.env.AUTH_URL || "http://localhost:3000";
  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  await sendMail({
    to,
    subject: "Reset your Nova Elite Homes password",
    text: `Reset your password: ${resetUrl}`,
    html: `
      <p>You requested a password reset for your Nova Elite Homes account.</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `,
  });
}
