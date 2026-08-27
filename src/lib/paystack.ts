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
    throw new Error(data.message || "Payment could not be started.");
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
    throw new Error(data.message || "Payment could not be verified.");
  }
  return data.data as {
    status: string;
    reference: string;
    amount: number;
    currency: string;
    paid_at?: string;
  };
}

export type PaystackBank = {
  name: string;
  code: string;
};

export async function paystackListBanks() {
  if (paystackMockMode()) {
    return [
      { name: "Access Bank", code: "044" },
      { name: "GTBank", code: "058" },
      { name: "Zenith Bank", code: "057" },
      { name: "First Bank", code: "011" },
      { name: "UBA", code: "033" },
    ] satisfies PaystackBank[];
  }

  const res = await fetch(`${BASE}/bank?country=nigeria`, {
    headers: { Authorization: `Bearer ${secret()}` },
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || "Could not load banks.");
  }
  return (data.data as PaystackBank[]).map((b) => ({
    name: b.name,
    code: b.code,
  }));
}

export async function paystackCreateRecipient(input: {
  name: string;
  accountNumber: string;
  bankCode: string;
}) {
  if (paystackMockMode()) {
    return {
      recipient_code: `RCP_mock_${input.accountNumber.slice(-4)}`,
    };
  }

  const res = await fetch(`${BASE}/transferrecipient`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "nuban",
      name: input.name,
      account_number: input.accountNumber,
      bank_code: input.bankCode,
      currency: "NGN",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || "Could not save bank account.");
  }
  return data.data as { recipient_code: string };
}

export async function paystackInitiateTransfer(input: {
  amountKobo: number;
  recipientCode: string;
  reference: string;
  reason?: string;
}) {
  if (paystackMockMode()) {
    return {
      transfer_code: `TRF_mock_${input.reference.slice(-8)}`,
      status: "success",
      reference: input.reference,
    };
  }

  const res = await fetch(`${BASE}/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance",
      amount: input.amountKobo,
      recipient: input.recipientCode,
      reference: input.reference,
      reason: input.reason || "Payout",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || "Withdrawal transfer failed.");
  }
  return data.data as {
    transfer_code: string;
    status: string;
    reference: string;
  };
}
