/**
 * In-house KYC verification (replaces Prembly / YouVerify API calls).
 * Compares selfie vs ID photo + declared name using a vision model.
 * High confidence → auto-pass; otherwise → admin manual review.
 */

import { nameSimilarity } from "@/lib/kyc-id";

export type KycAiRecommendation = "approve" | "manual_review" | "reject";

export type KycAiVerifyResult = {
  ok: boolean;
  checkType: "nin_face";
  message: string;
  reference: string;
  confidence: number;
  faceMatched: boolean;
  nameMatched: boolean;
  recommendation: KycAiRecommendation;
  identity: Record<string, string | number | boolean | null>;
  raw: Record<string, unknown>;
};

type AiJson = {
  idNameOnDocument?: string;
  ninVisibleOnDocument?: string | null;
  faceMatchScore?: number;
  nameMatchScore?: number;
  idLooksAuthentic?: boolean;
  overallConfidence?: number;
  reasons?: string[];
  recommendation?: KycAiRecommendation;
};

function autoApproveMin() {
  return Number(process.env.KYC_AI_AUTO_APPROVE_MIN || "0.92");
}

function autoRejectMax() {
  return Number(process.env.KYC_AI_AUTO_REJECT_MAX || "0.28");
}

function openaiKey() {
  return (process.env.OPENAI_API_KEY || process.env.KYC_AI_API_KEY || "").trim();
}

function openaiModel() {
  return process.env.KYC_AI_MODEL || process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

async function runVisionCompare(input: {
  declaredName: string;
  nin: string;
  selfieUrl: string;
  idImageUrl: string;
}): Promise<AiJson> {
  const key = openaiKey();
  if (!key) {
    return {
      overallConfidence: 0,
      faceMatchScore: 0,
      nameMatchScore: nameSimilarity(input.declaredName, input.declaredName),
      idLooksAuthentic: false,
      recommendation: "manual_review",
      reasons: ["AI verification is not configured — queued for admin review."],
      idNameOnDocument: "",
    };
  }

  const system = `You are an identity verification assistant for a Nigerian property platform (House In Hands).
Compare a live selfie to a government ID / NIN slip photo and the applicant's declared legal name.
Return ONLY valid JSON with these fields:
{
  "idNameOnDocument": string,
  "ninVisibleOnDocument": string | null,
  "faceMatchScore": number (0-1),
  "nameMatchScore": number (0-1),
  "idLooksAuthentic": boolean,
  "overallConfidence": number (0-1),
  "reasons": string[],
  "recommendation": "approve" | "manual_review" | "reject"
}
Rules:
- approve only if faces clearly match AND name is clearly the same person AND ID looks real.
- reject only for clear fraud / different people / obviously fake ID.
- otherwise use manual_review.
- Be conservative. Prefer manual_review when unsure.`;

  const userText = `Declared legal name: ${input.declaredName}
Declared NIN (last 4 only for reference): ****${input.nin.slice(-4)}
Image 1 = selfie. Image 2 = ID / NIN document.
Assess face match, name match, and ID authenticity.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openaiModel(),
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: input.selfieUrl } },
            { type: "image_url", image_url: { url: input.idImageUrl } },
          ],
        },
      ],
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!res.ok) {
    throw new Error(
      data.error?.message || `KYC AI request failed (${res.status})`
    );
  }

  const content = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(content) as AiJson;
  } catch {
    return {
      recommendation: "manual_review",
      overallConfidence: 0,
      reasons: ["Could not parse AI response — queued for admin review."],
    };
  }
}

function decideRecommendation(
  ai: AiJson,
  nameScoreFallback: number
): {
  recommendation: KycAiRecommendation;
  confidence: number;
  faceMatched: boolean;
  nameMatched: boolean;
} {
  const face = clamp01(Number(ai.faceMatchScore ?? 0));
  const name = clamp01(
    Number(
      ai.nameMatchScore != null ? ai.nameMatchScore : nameScoreFallback
    )
  );
  const overall = clamp01(
    Number(
      ai.overallConfidence != null
        ? ai.overallConfidence
        : (face * 0.65 + name * 0.35)
    )
  );

  let recommendation: KycAiRecommendation =
    ai.recommendation === "approve" ||
    ai.recommendation === "reject" ||
    ai.recommendation === "manual_review"
      ? ai.recommendation
      : "manual_review";

  const approveMin = autoApproveMin();
  const rejectMax = autoRejectMax();

  // Enforce conservative thresholds regardless of model wording.
  if (
    overall >= approveMin &&
    face >= approveMin - 0.05 &&
    name >= 0.75 &&
    ai.idLooksAuthentic !== false
  ) {
    recommendation = "approve";
  } else if (overall <= rejectMax && face <= rejectMax && name < 0.4) {
    recommendation = "reject";
  } else if (recommendation === "approve" && overall < approveMin) {
    recommendation = "manual_review";
  } else if (recommendation === "reject" && overall > rejectMax + 0.15) {
    recommendation = "manual_review";
  }

  return {
    recommendation,
    confidence: overall,
    faceMatched: face >= 0.7,
    nameMatched: name >= 0.7,
  };
}

/**
 * Verify applicant selfie against ID image + declared name.
 * Same check shape as previous Prembly/YouVerify nin_face flow.
 */
export async function verifyIdentityWithAi(input: {
  declaredName: string;
  nin: string;
  selfieUrl: string;
  idImageUrl: string;
}): Promise<KycAiVerifyResult> {
  const reference = `hih-ai-${Date.now().toString(36)}`;
  const nameFallback = nameSimilarity(
    input.declaredName,
    input.declaredName
  );

  let ai: AiJson;
  try {
    ai = await runVisionCompare(input);
  } catch (err) {
    return {
      ok: false,
      checkType: "nin_face",
      message:
        err instanceof Error
          ? `${err.message} — queued for admin review.`
          : "AI verification error — queued for admin review.",
      reference,
      confidence: 0,
      faceMatched: false,
      nameMatched: false,
      recommendation: "manual_review",
      identity: {
        declaredName: input.declaredName,
        ninLast4: input.nin.slice(-4),
      },
      raw: { error: err instanceof Error ? err.message : String(err) },
    };
  }

  // Blend model name score with local token similarity vs extracted ID name.
  const extracted = String(ai.idNameOnDocument || "");
  const localName = extracted
    ? nameSimilarity(input.declaredName, extracted)
    : 0;
  const blendedName = clamp01(
    Math.max(Number(ai.nameMatchScore ?? 0), localName)
  );
  ai.nameMatchScore = blendedName;

  const decided = decideRecommendation(ai, blendedName);
  const reasons = Array.isArray(ai.reasons) ? ai.reasons : [];

  if (decided.recommendation === "approve") {
    return {
      ok: true,
      checkType: "nin_face",
      message:
        reasons[0] ||
        "AI verified selfie, ID photo, and name with high confidence.",
      reference,
      confidence: decided.confidence,
      faceMatched: decided.faceMatched,
      nameMatched: decided.nameMatched,
      recommendation: "approve",
      identity: {
        declaredName: input.declaredName,
        idNameOnDocument: extracted || input.declaredName,
        ninLast4: input.nin.slice(-4),
        firstName: extracted.split(/\s+/)[0] || "",
        surname: extracted.split(/\s+/).slice(-1)[0] || "",
      },
      raw: ai as Record<string, unknown>,
    };
  }

  if (decided.recommendation === "reject") {
    return {
      ok: false,
      checkType: "nin_face",
      message:
        reasons[0] ||
        "Identity check failed: selfie, ID, or name did not match.",
      reference,
      confidence: decided.confidence,
      faceMatched: decided.faceMatched,
      nameMatched: decided.nameMatched,
      recommendation: "reject",
      identity: {
        declaredName: input.declaredName,
        idNameOnDocument: extracted,
        ninLast4: input.nin.slice(-4),
      },
      raw: ai as Record<string, unknown>,
    };
  }

  return {
    ok: false,
    checkType: "nin_face",
    message:
      reasons[0] ||
      "AI could not verify with high confidence — queued for admin review.",
    reference,
    confidence: decided.confidence,
    faceMatched: decided.faceMatched,
    nameMatched: decided.nameMatched,
    recommendation: "manual_review",
    identity: {
      declaredName: input.declaredName,
      idNameOnDocument: extracted,
      ninLast4: input.nin.slice(-4),
    },
    raw: ai as Record<string, unknown>,
  };
}
