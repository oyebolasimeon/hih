/**
 * House In Hands AI Property Manager — validates building issue reports,
 * checks proof photos, and recommends landlord actions / escalation.
 */

export type BuildingAiRecommendation =
  | "escalate"
  | "needs_more_proof"
  | "dismiss"
  | "manual_review";

export type BuildingAiReviewResult = {
  recommendation: BuildingAiRecommendation;
  confidence: number;
  summary: string;
  reasons: string[];
  proofSufficient: boolean;
  suggestedPriority: "low" | "medium" | "high" | "urgent";
  recommendedLandlordActions: string[];
};

type AiJson = {
  recommendation?: BuildingAiRecommendation;
  confidence?: number;
  summary?: string;
  reasons?: string[];
  proofSufficient?: boolean;
  suggestedPriority?: "low" | "medium" | "high" | "urgent";
  recommendedLandlordActions?: string[];
};

function openaiKey() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.BUILDING_ISSUE_AI_API_KEY ||
    ""
  ).trim();
}

function openaiModel() {
  return (
    process.env.BUILDING_ISSUE_AI_MODEL ||
    process.env.OPENAI_VISION_MODEL ||
    "gpt-4o-mini"
  );
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export async function reviewBuildingIssueWithAiPm(input: {
  category: string;
  title: string;
  description: string;
  locationNote?: string;
  evidenceUrls: string[];
  propertyTitle: string;
  propertyAddress: string;
}): Promise<BuildingAiReviewResult> {
  const key = openaiKey();
  if (!key) {
    const hasProof = input.evidenceUrls.length > 0;
    return {
      recommendation: hasProof ? "escalate" : "needs_more_proof",
      confidence: 0,
      summary: hasProof
        ? "AI Property Manager is not configured — escalating with attached proof for landlord follow-up."
        : "AI Property Manager is not configured — ask the tenant for photo proof before escalating.",
      reasons: [
        "OPENAI_API_KEY not set; using conservative fallback rules.",
      ],
      proofSufficient: hasProof,
      suggestedPriority: "medium",
      recommendedLandlordActions: hasProof
        ? [
            "Inspect the reported area within 48 hours",
            "Confirm the issue against the tenant photos",
            "Arrange repair or specialist if confirmed",
            "Update the case with action taken until closed",
          ]
        : [
            "Request clear photos or video of the issue from the tenant",
            "Re-run validation once proof is attached",
          ],
    };
  }

  const system = `You are the House In Hands AI Property Manager for Nigerian residential buildings.
Validate a tenant building-issue report. Return ONLY JSON:
{
  "recommendation": "escalate" | "needs_more_proof" | "dismiss" | "manual_review",
  "confidence": number (0-1),
  "summary": string,
  "reasons": string[],
  "proofSufficient": boolean,
  "suggestedPriority": "low" | "medium" | "high" | "urgent",
  "recommendedLandlordActions": string[]  // concrete next steps for the landlord
}
Rules:
- escalate when the report is credible and proof (if required) supports it, OR safety/urgent risk is clear.
- needs_more_proof when photos are missing, blurry, unrelated, or description is too vague.
- dismiss only for clear spam / off-topic / not a building issue.
- manual_review when unsure.
- recommendedLandlordActions must be short, actionable steps (3–6 items).
- Be practical for Nigerian rental properties (plumbing, power, septic, security, common areas).`;

  const userText = `Property: ${input.propertyTitle}
Address: ${input.propertyAddress}
Category: ${input.category}
Title: ${input.title}
Location note: ${input.locationNote || "n/a"}
Description: ${input.description}
Evidence image count: ${input.evidenceUrls.length}`;

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: userText }];

  for (const url of input.evidenceUrls.slice(0, 4)) {
    if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(url) || url.includes("image")) {
      content.push({ type: "image_url", image_url: { url } });
    }
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: openaiModel(),
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content },
        ],
      }),
    });

    if (!res.ok) {
      return {
        recommendation: "manual_review",
        confidence: 0,
        summary: `AI Property Manager provider error (${res.status}). Queued for careful landlord review.`,
        reasons: ["Vision/text model request failed."],
        proofSufficient: input.evidenceUrls.length > 0,
        suggestedPriority: "medium",
        recommendedLandlordActions: [
          "Review the tenant report manually",
          "Request additional proof if needed",
          "Inspect and update the case",
        ],
      };
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw) as AiJson;
    const recommendation =
      parsed.recommendation === "escalate" ||
      parsed.recommendation === "needs_more_proof" ||
      parsed.recommendation === "dismiss" ||
      parsed.recommendation === "manual_review"
        ? parsed.recommendation
        : "manual_review";
    const priority =
      parsed.suggestedPriority === "low" ||
      parsed.suggestedPriority === "medium" ||
      parsed.suggestedPriority === "high" ||
      parsed.suggestedPriority === "urgent"
        ? parsed.suggestedPriority
        : "medium";

    return {
      recommendation,
      confidence: clamp01(Number(parsed.confidence ?? 0)),
      summary: String(parsed.summary || "AI Property Manager completed review."),
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons.map(String).slice(0, 12)
        : [],
      proofSufficient: Boolean(parsed.proofSufficient),
      suggestedPriority: priority,
      recommendedLandlordActions: Array.isArray(
        parsed.recommendedLandlordActions
      )
        ? parsed.recommendedLandlordActions.map(String).slice(0, 8)
        : [
            "Inspect the reported issue",
            "Arrange repair if confirmed",
            "Update the case until closed",
          ],
    };
  } catch {
    return {
      recommendation: "manual_review",
      confidence: 0,
      summary: "AI Property Manager failed — escalate carefully with human judgment.",
      reasons: ["Unexpected AI error."],
      proofSufficient: input.evidenceUrls.length > 0,
      suggestedPriority: "medium",
      recommendedLandlordActions: [
        "Review report and proof",
        "Inspect on site if needed",
        "Record action taken and close when resolved",
      ],
    };
  }
}
