import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.GOOGLE_SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.GOOGLE_SMTP_PORT || 587);
  const user = process.env.GOOGLE_SMTP_USER;
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
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
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
  const sendPromise = transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      sendPromise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Email send timed out")),
          15_000
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
