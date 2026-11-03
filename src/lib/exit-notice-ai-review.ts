/**
 * AI screening for exit / vacate notices against lease terms.
 * Conservative: prefers manual_review. Never auto-serves the tenant.
 */

export type ExitAiRecommendation = "approve" | "manual_review" | "reject";

export type ExitAiReviewResult = {
  recommendation: ExitAiRecommendation;
  confidence: number;
  reasons: string[];
  noticePeriodLooksAdequate: boolean;
  groundsAlignedWithAgreement: boolean;
  refundLikelyNeeded: boolean;
};

type AiJson = {
  recommendation?: ExitAiRecommendation;
  confidence?: number;
  reasons?: string[];
  noticePeriodLooksAdequate?: boolean;
  groundsAlignedWithAgreement?: boolean;
  refundLikelyNeeded?: boolean;
};

function openaiKey() {
  return (process.env.OPENAI_API_KEY || process.env.EXIT_NOTICE_AI_API_KEY || "").trim();
}

function openaiModel() {
  return (
    process.env.EXIT_NOTICE_AI_MODEL ||
    process.env.OPENAI_TEXT_MODEL ||
    "gpt-4o-mini"
  );
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export async function reviewExitNoticeWithAi(input: {
  noticeType: string;
  reason: string;
  proposedVacateDate: Date;
  leaseStart: Date;
  leaseEnd?: Date | null;
  rentAmount: number;
  currency: string;
  paymentPeriod: string;
  leaseTermsText: string;
  unpaidRentDetected: boolean;
  daysUntilVacate: number;
}): Promise<ExitAiReviewResult> {
  const key = openaiKey();
  if (!key) {
    return {
      recommendation: "manual_review",
      confidence: 0,
      reasons: [
        "Exit-notice AI is not configured — queued for human legal/ops review.",
      ],
      noticePeriodLooksAdequate: false,
      groundsAlignedWithAgreement: false,
      refundLikelyNeeded: input.unpaidRentDetected,
    };
  }

  const system = `You are a cautious Nigerian tenancy operations assistant for House In Hands.
Screen a proposed exit/vacate notice against the lease summary. Return ONLY JSON:
{
  "recommendation": "approve" | "manual_review" | "reject",
  "confidence": number (0-1),
  "reasons": string[],
  "noticePeriodLooksAdequate": boolean,
  "groundsAlignedWithAgreement": boolean,
  "refundLikelyNeeded": boolean
}
Rules:
- approve only if grounds clearly align with the agreement AND notice period looks reasonable for the payment period.
- reject only for clear abuse, impossible dates, or contradiction of the agreement.
- otherwise manual_review. Prefer manual_review when unsure.
- Never invent local statutes; if statutory notice period is unclear, use manual_review.
- If unpaid rent or early exit with prepaid rent is involved, set refundLikelyNeeded true and prefer manual_review.`;

  const userText = `Notice type: ${input.noticeType}
Reason: ${input.reason}
Proposed vacate: ${input.proposedVacateDate.toISOString().slice(0, 10)}
Days until vacate (from now): ${input.daysUntilVacate}
Lease: ${input.leaseStart.toISOString().slice(0, 10)} – ${
    input.leaseEnd ? input.leaseEnd.toISOString().slice(0, 10) : "open"
  }
Rent: ${input.currency} ${input.rentAmount} / ${input.paymentPeriod}
Unpaid current-period rent detected: ${input.unpaidRentDetected}
Lease terms:
${input.leaseTermsText.slice(0, 3500)}`;

  try {
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
          { role: "user", content: userText },
        ],
      }),
    });
    if (!res.ok) {
      return {
        recommendation: "manual_review",
        confidence: 0,
        reasons: [`AI provider error (${res.status}) — queued for human review.`],
        noticePeriodLooksAdequate: false,
        groundsAlignedWithAgreement: false,
        refundLikelyNeeded: input.unpaidRentDetected,
      };
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as AiJson;
    const recommendation =
      parsed.recommendation === "approve" ||
      parsed.recommendation === "reject" ||
      parsed.recommendation === "manual_review"
        ? parsed.recommendation
        : "manual_review";
    // Never auto-serve: "approve" still means human may fast-track; UI still requires human serve.
    return {
      recommendation,
      confidence: clamp01(Number(parsed.confidence ?? 0)),
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons.map(String).slice(0, 12)
        : ["No AI reasons returned."],
      noticePeriodLooksAdequate: Boolean(parsed.noticePeriodLooksAdequate),
      groundsAlignedWithAgreement: Boolean(parsed.groundsAlignedWithAgreement),
      refundLikelyNeeded: Boolean(
        parsed.refundLikelyNeeded || input.unpaidRentDetected
      ),
    };
  } catch {
    return {
      recommendation: "manual_review",
      confidence: 0,
      reasons: ["AI review failed — queued for human legal/ops review."],
      noticePeriodLooksAdequate: false,
      groundsAlignedWithAgreement: false,
      refundLikelyNeeded: input.unpaidRentDetected,
    };
  }
}
