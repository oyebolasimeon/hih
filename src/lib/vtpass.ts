/**
 * VTpass REST API client
 * @see https://vtpass.com/documentation/
 */

import { randomBytes } from "crypto";

export type VtpassServiceCategory = {
  identifier: string;
  name: string;
};

export type VtpassService = {
  serviceID: string;
  name: string;
  minimium_amount?: string;
  maximum_amount?: string;
  convinience_fee?: string;
  product_type?: string;
  image?: string;
};

export type VtpassVariation = {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice?: string;
};

export type VtpassVerifyResult = {
  customerName: string;
  address: string;
  accountNumber: string;
  raw?: unknown;
};

export type VtpassPayResult = {
  requestId: string;
  token: string | null;
  purchasedCode: string | null;
  raw: unknown;
};

export type VtpassRequeryResult = {
  status: string;
  productName: string;
  purchasedCode: string | null;
  amount: number | null;
  raw: unknown;
};

function apiKey() {
  return process.env.VTPASS_API_KEY || "";
}

function secretKey() {
  return process.env.VTPASS_SECRET_KEY || "";
}

function publicKey() {
  return process.env.VTPASS_PUBLIC_KEY || "";
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
  return Boolean(apiKey() && secretKey() && publicKey());
}

export function vtpassMockMode() {
  return (
    process.env.VTPASS_MOCK === "1" ||
    process.env.VTPASS_MOCK === "true" ||
    !vtpassConfigured()
  );
}

function getHeaders() {
  return {
    "api-key": apiKey(),
    "public-key": publicKey(),
  };
}

function postHeaders() {
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

type VtpassEnvelope = {
  code?: string;
  response_description?: string;
  content?: unknown;
  message?: string;
};

function assertOk(data: VtpassEnvelope) {
  if (data.code && data.code !== "000" && data.code !== "099") {
    throw new Error(data.response_description || "Bill service request failed.");
  }
}

let catalogCache: {
  at: number;
  categories: VtpassServiceCategory[];
} | null = null;

const servicesCache = new Map<
  string,
  { at: number; services: VtpassService[] }
>();

const variationsCache = new Map<
  string,
  { at: number; data: { serviceName: string; variations: VtpassVariation[] } }
>();

const CACHE_MS = 60 * 60 * 1000;

function mockCategories(): VtpassServiceCategory[] {
  return [
    { identifier: "electricity-bill", name: "Electricity Bill" },
    { identifier: "tv-subscription", name: "TV Subscription" },
    { identifier: "data", name: "Data Services" },
    { identifier: "airtime", name: "Airtime Recharge" },
    { identifier: "education", name: "Education" },
    { identifier: "insurance", name: "Insurance" },
    { identifier: "other-services", name: "Other Services" },
  ];
}

function mockServices(identifier: string): VtpassService[] {
  const map: Record<string, VtpassService[]> = {
    "electricity-bill": [
      { serviceID: "ikeja-electric", name: "Ikeja Electric", product_type: "flex", minimium_amount: "500", maximum_amount: "500000" },
      { serviceID: "eko-electric", name: "Eko Electric", product_type: "flex", minimium_amount: "500", maximum_amount: "500000" },
      { serviceID: "abuja-electric", name: "Abuja Electric", product_type: "flex", minimium_amount: "500", maximum_amount: "500000" },
      { serviceID: "ibadan-electric", name: "Ibadan Electric", product_type: "flex", minimium_amount: "500", maximum_amount: "500000" },
    ],
    "tv-subscription": [
      { serviceID: "dstv", name: "DSTV Subscription", product_type: "fix" },
      { serviceID: "gotv", name: "GOtv Subscription", product_type: "fix" },
      { serviceID: "startimes", name: "StarTimes Subscription", product_type: "fix" },
      { serviceID: "showmax", name: "Showmax", product_type: "fix" },
    ],
    data: [
      { serviceID: "mtn-data", name: "MTN Data", product_type: "fix" },
      { serviceID: "airtel-data", name: "Airtel Data", product_type: "fix" },
      { serviceID: "glo-data", name: "GLO Data", product_type: "fix" },
      { serviceID: "etisalat-data", name: "9mobile Data", product_type: "fix" },
      { serviceID: "smile-direct", name: "Smile Payment", product_type: "fix" },
      { serviceID: "spectranet", name: "Spectranet", product_type: "fix" },
    ],
    airtime: [
      { serviceID: "mtn", name: "MTN Airtime", product_type: "flex", minimium_amount: "50", maximum_amount: "50000" },
      { serviceID: "airtel", name: "Airtel Airtime", product_type: "flex", minimium_amount: "50", maximum_amount: "50000" },
      { serviceID: "glo", name: "GLO Airtime", product_type: "flex", minimium_amount: "50", maximum_amount: "50000" },
      { serviceID: "etisalat", name: "9mobile Airtime", product_type: "flex", minimium_amount: "50", maximum_amount: "50000" },
    ],
    education: [
      { serviceID: "waec-registration", name: "WAEC Registration", product_type: "fix" },
      { serviceID: "waec", name: "WAEC Result Checker", product_type: "fix" },
      { serviceID: "jamb", name: "JAMB PIN", product_type: "fix" },
    ],
    insurance: [
      { serviceID: "ui-insure", name: "Third Party Motor Insurance", product_type: "fix" },
    ],
  };
  return map[identifier] || [];
}

function mockVariations(serviceID: string) {
  if (serviceID.includes("electric")) {
    return {
      serviceName: serviceID,
      variations: [
        { variation_code: "prepaid", name: "Prepaid", variation_amount: "0", fixedPrice: "No" },
        { variation_code: "postpaid", name: "Postpaid", variation_amount: "0", fixedPrice: "No" },
      ],
    };
  }
  if (serviceID === "gotv") {
    return {
      serviceName: "GOtv",
      variations: [
        { variation_code: "gotv-lite", name: "GOtv Lite", variation_amount: "400", fixedPrice: "Yes" },
        { variation_code: "gotv-value", name: "GOtv Value", variation_amount: "1250", fixedPrice: "Yes" },
      ],
    };
  }
  if (serviceID === "mtn-data") {
    return {
      serviceName: "MTN Data",
      variations: [
        { variation_code: "mtn-500mb", name: "500MB", variation_amount: "500", fixedPrice: "Yes" },
        { variation_code: "mtn-1gb", name: "1GB", variation_amount: "1000", fixedPrice: "Yes" },
      ],
    };
  }
  return { serviceName: serviceID, variations: [] as VtpassVariation[] };
}

async function vtpassGet<T>(path: string): Promise<T> {
  if (vtpassMockMode()) {
    return mockGet(path) as T;
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    headers: getHeaders(),
  });
  const data = (await res.json()) as VtpassEnvelope;
  if (!res.ok) {
    throw new Error(data.response_description || data.message || "Could not load bill options.");
  }
  assertOk(data);
  return data.content as T;
}

function mockGet(path: string): unknown {
  if (path === "/service-categories") return mockCategories();
  const servicesMatch = path.match(/\/services\?identifier=([^&]+)/);
  if (servicesMatch) return mockServices(servicesMatch[1]);
  const varMatch = path.match(/service-variations\?serviceID=([^&]+)/);
  if (varMatch) return mockVariations(decodeURIComponent(varMatch[1]));
  return [];
}

async function vtpassPost(path: string, body: Record<string, unknown>) {
  if (vtpassMockMode()) {
    return mockPost(path, body);
  }

  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: postHeaders(),
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as VtpassEnvelope & {
    purchased_code?: string;
    content?: {
      Customer_Name?: string;
      Address?: string;
      Meter_Number?: string;
      tokens?: string[];
      token?: string;
      purchased_code?: string;
      transactions?: {
        status?: string;
        product_name?: string;
      };
    };
  };
  if (!res.ok) {
    throw new Error(data.response_description || data.message || "Bill payment request failed.");
  }
  assertOk(data);
  return data;
}

function mockPost(path: string, body: Record<string, unknown>) {
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
    const code = isElectric ? "1234-5678-9012-3456-7890" : "Payment successful";
    return {
      code: "000",
      response_description: "TRANSACTION SUCCESSFUL",
      content: {
        purchased_code: code,
        token: isElectric ? code : undefined,
        transactions: { status: "delivered", product_name: String(body.serviceID) },
      },
    };
  }
  if (path.includes("/requery")) {
    return {
      code: "000",
      response_description: "TRANSACTION SUCCESSFUL",
      purchased_code: "1234-5678-9012-3456-7890",
      content: {
        transactions: { status: "delivered", product_name: "Mock Product" },
      },
    };
  }
  return { code: "000", response_description: "OK", content: {} };
}

export async function vtpassGetServiceCategories() {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < CACHE_MS) {
    return catalogCache.categories;
  }
  const categories = await vtpassGet<VtpassServiceCategory[]>("/service-categories");
  catalogCache = { at: now, categories: categories || [] };
  return catalogCache.categories;
}

export async function vtpassGetServices(identifier: string) {
  const now = Date.now();
  const cached = servicesCache.get(identifier);
  if (cached && now - cached.at < CACHE_MS) return cached.services;

  const services = await vtpassGet<VtpassService[]>(
    `/services?identifier=${encodeURIComponent(identifier)}`
  );
  const list = services || [];
  servicesCache.set(identifier, { at: now, services: list });
  return list;
}

export async function vtpassGetVariations(serviceID: string) {
  const now = Date.now();
  const cached = variationsCache.get(serviceID);
  if (cached && now - cached.at < CACHE_MS) return cached.data;

  const content = await vtpassGet<{
    ServiceName?: string;
    serviceID?: string;
    variations?: VtpassVariation[];
    varations?: VtpassVariation[];
  }>(`/service-variations?serviceID=${encodeURIComponent(serviceID)}`);

  const variations = content?.variations || content?.varations || [];
  const data = {
    serviceName: content?.ServiceName || serviceID,
    variations,
  };
  variationsCache.set(serviceID, { at: now, data });
  return data;
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
  const content = data.content as {
    Customer_Name?: string;
    Address?: string;
    Meter_Number?: string;
  } | undefined;

  return {
    customerName: content?.Customer_Name || "Customer",
    address: content?.Address || "",
    accountNumber: content?.Meter_Number || input.billersCode,
    raw: data,
  } satisfies VtpassVerifyResult;
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
  const content = data.content as {
    purchased_code?: string;
    token?: string;
    tokens?: string[];
  } | undefined;

  const purchasedCode =
    data.purchased_code ||
    content?.purchased_code ||
    content?.token ||
    content?.tokens?.[0] ||
    null;

  return {
    requestId: input.requestId,
    token: purchasedCode,
    purchasedCode,
    raw: data,
  } satisfies VtpassPayResult;
}

export async function vtpassRequery(requestId: string) {
  const data = await vtpassPost("/requery", { request_id: requestId });
  const content = data.content as {
    transactions?: { status?: string; product_name?: string };
  } | undefined;

  return {
    status: content?.transactions?.status || "unknown",
    productName: content?.transactions?.product_name || "",
    purchasedCode: (data as { purchased_code?: string }).purchased_code || null,
    amount: typeof (data as { amount?: number }).amount === "number"
      ? (data as { amount: number }).amount
      : null,
    raw: data,
  } satisfies VtpassRequeryResult;
}
