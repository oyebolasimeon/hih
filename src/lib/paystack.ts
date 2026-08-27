/**
 * Paystack payments (NGN).
 * Docs: https://paystack.com/docs/api/
 */

const BASE = "https://api.paystack.co";

function secret() {
  return process.env.PAYSTACK_SECRET_KEY || "";
}

export function paystackConfigured() {
  return Boolean(secret());
}

export function paystackMockMode() {
  return process.env.PAYSTACK_MOCK === "true" || !secret();
}

export async function paystackInitialize(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  if (paystackMockMode()) {
    const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
      /\/$/,
      ""
    );
    const callback = input.callbackUrl || `${appUrl}/portal/payments?paid=1`;
    const sep = callback.includes("?") ? "&" : "?";
    return {
      authorization_url: `${callback}${sep}mock_ref=${encodeURIComponent(input.reference)}&paid=1`,
      access_code: `mock_${input.reference}`,
      reference: input.reference,
      mock: true,
    };
  }

  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      currency: "NGN",
      metadata: input.metadata,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || "Paystack initialize failed");
  }
  return data.data as {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function paystackVerify(reference: string) {
  if (paystackMockMode() || reference.startsWith("hih_mock_")) {
    return {
      status: "success",
      reference,
      amount: 0,
      currency: "NGN",
      paid_at: new Date().toISOString(),
      mock: true,
    };
  }

  const res = await fetch(
    `${BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret()}` },
    }
  );
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || "Paystack verify failed");
  }
  return data.data as {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at?: string;
  };
}
