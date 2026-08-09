import { NextResponse } from "next/server";

type ContactBody = {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  website?: string;
  turnstileToken?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Cloudflare always-pass dummy secret for localhost; real secret in production
function getTurnstileSecret() {
  if (process.env.NODE_ENV === "development") {
    return "1x0000000000000000000000000000000AA";
  }
  return process.env.TURNSTILE_SECRET_KEY ?? "";
}

async function verifyTurnstile(token: string, ip: string | null) {
  const secret = getTurnstileSecret();
  if (!secret) {
    return { success: false, error: "Turnstile is not configured." };
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);
  if (ip) formData.append("remoteip", ip);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: formData }
  );

  const data = (await response.json()) as {
    success: boolean;
    "error-codes"?: string[];
  };

  return data;
}

/**
 * Validates the submission + Turnstile.
 * Email is sent from the browser to Web3Forms (free plans block most server IPs).
 */
export async function POST(request: Request) {
  let body: ContactBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  // Honeypot — pretend success so bots think it worked
  if (body.website?.trim()) {
    return NextResponse.json({ success: true, skipSend: true });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  const turnstileToken = body.turnstileToken?.trim() ?? "";

  if (!turnstileToken) {
    return NextResponse.json(
      { success: false, message: "Please complete the security check and try again." },
      { status: 400 }
    );
  }

  if (name.length < 2 || name.length > 100) {
    return NextResponse.json(
      { success: false, message: "Please enter your full name." },
      { status: 400 }
    );
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json(
      { success: false, message: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  if (phone.length > 30) {
    return NextResponse.json(
      { success: false, message: "Please enter a valid phone number." },
      { status: 400 }
    );
  }

  if (message.length < 10 || message.length > 2000) {
    return NextResponse.json(
      { success: false, message: "Please provide a bit more detail in your message." },
      { status: 400 }
    );
  }

  const urlMatches = message.match(/https?:\/\/|www\./gi) ?? [];
  if (urlMatches.length > 2) {
    return NextResponse.json(
      { success: false, message: "Please remove extra links from your message and try again." },
      { status: 400 }
    );
  }

  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;

  try {
    const turnstile = await verifyTurnstile(turnstileToken, ip);
    if (!turnstile.success) {
      return NextResponse.json(
        { success: false, message: "Security check failed. Please refresh and try again." },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to verify security check. Please try again." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
