/**
 * VTpass bill payment API (Nigeria utilities).
 * Docs: https://vtpass.com/documentation/
 */

import { randomBytes } from "crypto";

function apiKey() {
  return process.env.VTPASS_API_KEY || "";
}

function secretKey() {
  return process.env.VTPASS_SECRET_KEY || process.env.VTPASS_PUBLIC_KEY || "";
}

function baseUrl() {
  const sandbox =
    process.env.VTPASS_SANDBOX === "1" ||
    process.env.VTPASS_SANDBOX === "true" ||
    !apiKey();
  return sandbox
    ? "https://sandbox.vtpass.com/api"
    : "https://vtpass.com/api";
}

export function vtpassConfigured() {
  return Boolean(apiKey() && secretKey());
}

export function vtpassMockMode() {
  return (
    process.env.VTPASS_MOCK === "1" ||
    process.env.VTPASS_MOCK === "true" ||
    !vtpassConfigured()
  );
}

function vtpassHeaders() {
  return {
    "api-key": apiKey(),
    "secret-key": secretKey(),
    "Content-Type": "application/json",
  };
}

/** VTpass request_id — Africa/Lagos datetime + suffix */
export function vtpassRequestId() {
  const now = new Date();
  const lagos = new Date(
    now.toLocaleString("en-US", { timeZone: "Africa/Lagos" })
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  const prefix =
    `${lagos.getFullYear()}${pad(lagos.getMonth() + 1)}${pad(lagos.getDate())}` +
    `${pad(lagos.getHours())}${pad(lagos.getMinutes())}`;
  return `${prefix}${randomBytes(4).toString("hex")}`;
}

type VtpassResponse = {
  code?: string;
  response_description?: string;
  content?: {
    Customer_Name?: string;
    Address?: string;
    Meter_Number?: string;
    tokens?: string[];
    token?: string;
    purchased_code?: string;
    transactions?: { product_name?: string; unique_element?: string };
  };
};

async function vtpassPost(path: string, body: Record<string, unknown>) {
  if (vtpassMockMode()) {
    return mockResponse(path, body);
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: vtpassHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as VtpassResponse & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.response_description || data.message || "VTpass request failed.");
  }
  if (data.code && data.code !== "000" && data.code !== "099") {
    throw new Error(data.response_description || "VTpass request failed.");
  }
  return data;
}

function mockResponse(path: string, body: Record<string, unknown>) {
  if (path.includes("merchant-verify")) {
    return {
      code: "000",
      response_description: "TRANSACTION SUCCESSFUL",
      content: {
        Customer_Name: "MOCK CUSTOMER",
        Address: "12 Sample Estate, Lagos",
        Meter_Number: String(body.billersCode || ""),
      },
    };
  }
  if (path.includes("/pay")) {
    const isElectric = String(body.serviceID || "").includes("electric");
    return {
      code: "000",
      response_description: "TRANSACTION SUCCESSFUL",
      content: {
        purchased_code: isElectric
          ? "1234-5678-9012-3456-7890"
          : "Subscription renewed successfully",
        token: isElectric ? "1234-5678-9012-3456-7890" : undefined,
        tokens: isElectric ? ["1234-5678-9012-3456-7890"] : undefined,
      },
    };
  }
  return { code: "000", response_description: "OK", content: {} };
}

export async function vtpassVerify(input: {
  serviceID: string;
  billersCode: string;
  type?: "prepaid" | "postpaid";
}) {
  const payload: Record<string, unknown> = {
    serviceID: input.serviceID,
    billersCode: input.billersCode,
  };
  if (input.type) payload.type = input.type;

  const data = await vtpassPost("/merchant-verify", payload);
  return {
    customerName: data.content?.Customer_Name || "Customer",
    address: data.content?.Address || "",
    accountNumber: data.content?.Meter_Number || input.billersCode,
  };
}

export async function vtpassPay(input: {
  requestId: string;
  serviceID: string;
  billersCode: string;
  amount: number;
  phone: string;
  variationCode?: string;
}) {
  const payload: Record<string, unknown> = {
    request_id: input.requestId,
    serviceID: input.serviceID,
    billersCode: input.billersCode,
    amount: input.amount,
    phone: input.phone,
  };
  if (input.variationCode) {
    payload.variation_code = input.variationCode;
  }

  const data = await vtpassPost("/pay", payload);
  const token =
    data.content?.purchased_code ||
    data.content?.token ||
    data.content?.tokens?.[0] ||
    null;

  return {
    requestId: input.requestId,
    token,
    raw: data,
  };
}
