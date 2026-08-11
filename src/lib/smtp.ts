import nodemailer, { type Transporter } from "nodemailer";

type SmtpCandidate = {
  label: string;
  transport: () => Transporter;
};

function envFlag(name: string, defaultTrue = true): boolean {
  const v = process.env[name];
  if (v == null || v === "") return defaultTrue;
  return !(v === "0" || v.toLowerCase() === "false");
}

function fromAddress(): string {
  return (
    process.env.SMTP_FROM ||
    process.env.GOOGLE_SMTP_FROM ||
    process.env.SMTP_USER ||
    process.env.GOOGLE_SMTP_USER ||
    "House In Hand <noreply@houseinhand.com>"
  );
}

function tlsOptions() {
  return {
    rejectUnauthorized: envFlag("SMTP_TLS_REJECT_UNAUTHORIZED", false),
  };
}

function createSmtpTransport(opts: {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
}): Transporter {
  return nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    tls: tlsOptions(),
    ...(opts.user && opts.pass
      ? { auth: { user: opts.user, pass: opts.pass } }
      : {}),
  });
}

function createSendmailTransport(): Transporter {
  return nodemailer.createTransport({
    sendmail: true,
    newline: "unix",
    path: process.env.SMTP_SENDMAIL_PATH || "/usr/sbin/sendmail",
  });
}

function primaryCredentials() {
  const user = process.env.SMTP_USER || process.env.GOOGLE_SMTP_USER;
  const rawPass =
    process.env.SMTP_PASSWORD ||
    process.env.GOOGLE_SMTP_PASSWORD ||
    process.env.GOOGLE_SMTP_PASS;
  const pass = rawPass?.replace(/\s+/g, "");
  return { user, pass };
}

function primaryHostPort() {
  const host =
    process.env.SMTP_HOST ||
    process.env.GOOGLE_SMTP_HOST ||
    "smtp.gmail.com";
  const port = Number(
    process.env.SMTP_PORT || process.env.GOOGLE_SMTP_PORT || 587
  );
  const secureEnv = process.env.SMTP_SECURE ?? process.env.GOOGLE_SMTP_SECURE;
  const secure =
    secureEnv != null
      ? secureEnv === "true" || secureEnv === "1"
      : port === 465;
  return { host, port, secure };
}

function isRetryableSmtpError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code || "")
      : "";
  return (
    /timeout|timed out|ECONNREFUSED|ECONNRESET|ETIMEDOUT|ESOCKET|ENOTFOUND|connection/i.test(
      msg
    ) ||
    /ECONNECTION|ETIMEDOUT|ECONNREFUSED|ESOCKET|EENVELOPE/i.test(code)
  );
}

function buildCandidates(): SmtpCandidate[] {
  const transportMode = (process.env.SMTP_TRANSPORT || "smtp").toLowerCase();

  if (transportMode === "sendmail") {
    return [
      {
        label: "sendmail",
        transport: createSendmailTransport,
      },
    ];
  }

  const { host, port, secure } = primaryHostPort();
  const { user, pass } = primaryCredentials();
  const candidates: SmtpCandidate[] = [];

  candidates.push({
    label: `${host}:${port}`,
    transport: () =>
      createSmtpTransport({
        host,
        port,
        secure,
        user: user || undefined,
        pass: pass || undefined,
      }),
  });

  if (envFlag("SMTP_FALLBACK_LOCALHOST", true)) {
    const localHosts = ["localhost", "127.0.0.1"];
    const localPorts = Array.from(new Set([port, 587, 465]));
    for (const h of localHosts) {
      for (const p of localPorts) {
        if (h === host && p === port) continue;
        candidates.push({
          label: `${h}:${p}`,
          transport: () =>
            createSmtpTransport({
              host: h,
              port: p,
              secure: p === 465,
              user: user || undefined,
              pass: pass || undefined,
            }),
        });
      }
    }
    candidates.push({
      label: "127.0.0.1:25",
      transport: () =>
        createSmtpTransport({
          host: "127.0.0.1",
          port: 25,
          secure: false,
        }),
    });
  }

  if (envFlag("SMTP_FALLBACK_SENDMAIL", true)) {
    candidates.push({
      label: "sendmail",
      transport: createSendmailTransport,
    });
  }

  return candidates;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function verifySmtp(): Promise<{
  ok: boolean;
  endpoint?: string;
  error?: string;
}> {
  const candidates = buildCandidates();
  let lastError = "No SMTP candidates configured";

  for (const candidate of candidates) {
    try {
      const transport = candidate.transport();
      await withTimeout(transport.verify(), 12_000, `SMTP verify (${candidate.label})`);
      return { ok: true, endpoint: candidate.label };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (!isRetryableSmtpError(err) && candidate.label !== "sendmail") {
        // Auth/config failures on primary — don't pretend localhost fixed it
        const isPrimary = candidate === candidates[0];
        if (isPrimary) {
          return { ok: false, endpoint: candidate.label, error: lastError };
        }
      }
    }
  }

  return { ok: false, error: lastError };
}

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const from = fromAddress();
  const candidates = buildCandidates();
  let lastError: unknown = new Error("No SMTP candidates configured");

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    try {
      const transport = candidate.transport();
      await withTimeout(
        transport.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
        20_000,
        `SMTP send (${candidate.label})`
      );
      if (i > 0) {
        console.warn(`Email sent via fallback transport: ${candidate.label}`);
      }
      return;
    } catch (err) {
      lastError = err;
      const isPrimary = i === 0;
      if (isPrimary && !isRetryableSmtpError(err)) {
        throw err;
      }
      console.warn(
        `SMTP candidate failed (${candidate.label}):`,
        err instanceof Error ? err.message : err
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

export function smtpTransportMode(): string {
  return (process.env.SMTP_TRANSPORT || "smtp").toLowerCase();
}
