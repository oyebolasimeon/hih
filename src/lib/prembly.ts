/**
 * Prembly (IdentityPass) KYC client.
 * Docs: https://docs.prembly.com
 * Base: https://api.prembly.com
 * Headers: app-id + x-api-key
 */

export type PremblyEnv = "live" | "test";

export type PremblyCheckResult = {
  ok: boolean;
  checkType: string;
  responseCode?: string;
  message: string;
  reference?: string;
  confidence?: number;
  faceMatched?: boolean;
  /** Sanitized identity fields safe to persist (no full sensitive payload dump) */
  identity?: Record<string, string | number | boolean | null>;
  raw?: unknown;
};

function baseUrl() {
  return (
    process.env.PREMBLY_BASE_URL?.replace(/\/$/, "") ||
    "https://api.prembly.com"
  );
}

function isMockMode() {
  if (process.env.PREMBLY_MOCK === "true") return true;
  return !process.env.PREMBLY_API_KEY || !process.env.PREMBLY_APP_ID;
}

function headers(): HeadersInit {
  const apiKey = process.env.PREMBLY_API_KEY;
  const appId = process.env.PREMBLY_APP_ID;
  if (!apiKey || !appId) {
    throw new Error("Identity verification is not configured.");
  }
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-key": apiKey,
    "app-id": appId,
  };
}

async function premblyPost(
  path: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const detail =
      (typeof data.detail === "string" && data.detail) ||
      (typeof data.message === "string" && data.message) ||
      `Identity verification request failed (${res.status})`;
    throw new Error(detail);
  }
  return data;
}

function faceFrom(payload: Record<string, unknown>): {
  matched: boolean;
  confidence?: number;
  message?: string;
} {
  const face =
    (payload.face_data as Record<string, unknown> | undefined) ||
    ((payload.data as Record<string, unknown> | undefined)?.face_data as
      | Record<string, unknown>
      | undefined);
  if (!face) return { matched: false };
  const confidence =
    typeof face.confidence === "number" ? face.confidence : undefined;
  const matched =
    face.status === true ||
    String(face.message || "")
      .toLowerCase()
      .includes("match");
  return {
    matched,
    confidence,
    message: typeof face.message === "string" ? face.message : undefined,
  };
}

function verificationRef(payload: Record<string, unknown>): string | undefined {
  const v = payload.verification as Record<string, unknown> | undefined;
  if (typeof v?.reference === "string") return v.reference.trim();
  if (typeof v?.verification_id === "string") return v.verification_id.trim();
  return undefined;
}

function mockSuccess(
  checkType: string,
  identity: Record<string, string | number | boolean | null>
): PremblyCheckResult {
  return {
    ok: true,
    checkType,
    responseCode: "00",
    message: `Mock ${checkType} verified (demo mode)`,
    reference: `mock-${checkType}-${Date.now()}`,
    confidence: 0.99,
    faceMatched: checkType.includes("face"),
    identity,
  };
}

/** NIN + face match — required for all profile types */
export async function verifyNinWithFace(input: {
  nin: string;
  imageUrlOrBase64: string;
}): Promise<PremblyCheckResult> {
  if (isMockMode()) {
    return mockSuccess("nin_face", {
      ninLast4: input.nin.slice(-4),
      firstName: "Mock",
      surname: "User",
    });
  }

  const payload = await premblyPost(
    "/api/v2/biometrics/merchant/data/verification/nin_face",
    { number: input.nin, image: input.imageUrlOrBase64 }
  );

  const face = faceFrom(payload);
  const ninData =
    (payload.nin_data as Record<string, unknown> | undefined) ||
    (payload.data as Record<string, unknown> | undefined) ||
    {};
  const statusOk =
    payload.status === true || String(payload.response_code) === "00";
  const minConfidence = Number(process.env.PREMBLY_FACE_MIN_CONFIDENCE || "0.7");
  const confidenceOk =
    face.confidence == null ? face.matched : face.confidence >= minConfidence;

  return {
    ok: statusOk && face.matched && confidenceOk,
    checkType: "nin_face",
    responseCode: String(payload.response_code ?? ""),
    message:
      face.message ||
      (typeof payload.detail === "string" ? payload.detail : "") ||
      (typeof payload.message === "string" ? payload.message : "") ||
      (statusOk ? "NIN verification completed" : "NIN verification failed"),
    reference: verificationRef(payload),
    confidence: face.confidence,
    faceMatched: face.matched,
    identity: {
      ninLast4: String(ninData.nin || input.nin).slice(-4),
      firstName: String(ninData.firstname || ninData.firstName || ""),
      middleName: String(ninData.middlename || ninData.middleName || ""),
      surname: String(ninData.surname || ninData.lastName || ""),
      birthdate: String(ninData.birthdate || ninData.dateOfBirth || ""),
      phone: String(ninData.telephoneno || ninData.phoneNumber1 || ""),
      gender: String(ninData.gender || ""),
    },
    raw: sanitizePremblyRaw(payload),
  };
}

/** BVN + face — landlords (and optional estate managers) */
export async function verifyBvnWithFace(input: {
  bvn: string;
  imageUrlOrBase64: string;
}): Promise<PremblyCheckResult> {
  if (isMockMode()) {
    return mockSuccess("bvn_face", {
      bvnLast4: input.bvn.slice(-4),
      firstName: "Mock",
      lastName: "Landlord",
    });
  }

  const payload = await premblyPost(
    "/api/v1/biometrics/merchant/data/verification/bvn_w_face",
    { number: input.bvn, image: input.imageUrlOrBase64 }
  );

  const face = faceFrom(payload);
  const data = (payload.data as Record<string, unknown> | undefined) || {};
  const statusOk =
    payload.status === true || String(payload.response_code) === "00";
  const minConfidence = Number(process.env.PREMBLY_FACE_MIN_CONFIDENCE || "0.7");
  const confidenceOk =
    face.confidence == null ? face.matched : face.confidence >= minConfidence;

  return {
    ok: statusOk && face.matched && confidenceOk,
    checkType: "bvn_face",
    responseCode: String(payload.response_code ?? ""),
    message:
      face.message ||
      (typeof payload.detail === "string" ? payload.detail : "") ||
      "BVN verification completed",
    reference: verificationRef(payload),
    confidence: face.confidence,
    faceMatched: face.matched,
    identity: {
      bvnLast4: String(data.bvn || input.bvn).slice(-4),
      firstName: String(data.firstName || ""),
      middleName: String(data.middleName || ""),
      lastName: String(data.lastName || ""),
      phone: String(data.phoneNumber1 || ""),
      dateOfBirth: String(data.dateOfBirth || ""),
    },
    raw: sanitizePremblyRaw(payload),
  };
}

/** Basic CAC — estate managers */
export async function verifyCacBasic(input: {
  rcNumber: string;
  companyType?: "RC" | "BN" | "IT";
  companyName?: string;
}): Promise<PremblyCheckResult> {
  if (isMockMode()) {
    return mockSuccess("cac", {
      rcNumber: input.rcNumber,
      companyName: input.companyName || "Mock Company Ltd",
      companyType: input.companyType || "RC",
    });
  }

  const payload = await premblyPost(
    "/api/v1/biometrics/merchant/data/verification/cac",
    {
      rc_number: input.rcNumber,
      company_type: input.companyType || "RC",
      ...(input.companyName ? { company_name: input.companyName } : {}),
    }
  );

  const data = (payload.data as Record<string, unknown> | undefined) || payload;
  const statusOk =
    payload.status === true || String(payload.response_code) === "00";

  return {
    ok: statusOk,
    checkType: "cac",
    responseCode: String(payload.response_code ?? ""),
    message:
      (typeof payload.detail === "string" && payload.detail) ||
      (typeof payload.message === "string" && payload.message) ||
      (statusOk ? "CAC verification successful" : "CAC verification failed"),
    reference: verificationRef(payload),
    identity: {
      rcNumber: String(data.rc_number || data.rcNumber || input.rcNumber),
      companyName: String(
        data.company_name || data.companyName || input.companyName || ""
      ),
      companyStatus: String(data.status || data.company_status || ""),
      companyType: input.companyType || "RC",
    },
    raw: sanitizePremblyRaw(payload),
  };
}

/** Strip oversized fields (photos) before storing in Mongo */
export function sanitizePremblyRaw(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const clone = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  const stripPhoto = (obj: Record<string, unknown>) => {
    for (const key of Object.keys(obj)) {
      if (/photo|image|base64/i.test(key) && typeof obj[key] === "string") {
        const val = obj[key] as string;
        obj[key] = val.length > 80 ? `[omitted ${val.length} chars]` : val;
      } else if (obj[key] && typeof obj[key] === "object") {
        stripPhoto(obj[key] as Record<string, unknown>);
      }
    }
  };
  stripPhoto(clone);
  return clone;
}

export function maskId(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `****${digits.slice(-4)}`;
}
