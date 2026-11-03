/**
 * AI review for landlord property uploads.
 * Never auto-verifies for the marketplace — admin remains the final gate.
 * When not satisfied → escalate to admin queue + email.
 */

export type ListingAiRecommendation = "approve" | "manual_review" | "reject";

export type ListingAiReviewResult = {
  recommendation: ListingAiRecommendation;
  confidence: number;
  summary: string;
  reasons: string[];
  requiresManualReview: boolean;
  completenessScore: number;
};

type AiJson = {
  recommendation?: ListingAiRecommendation;
  confidence?: number;
  summary?: string;
  reasons?: string[];
  requiresManualReview?: boolean;
  completenessScore?: number;
};

function openaiKey() {
  return (
    process.env.OPENAI_API_KEY ||
    process.env.LISTING_AI_API_KEY ||
    ""
  ).trim();
}

function openaiModel() {
  return (
    process.env.LISTING_AI_MODEL ||
    process.env.OPENAI_VISION_MODEL ||
    "gpt-4o-mini"
  );
}

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

export async function reviewListingWithAi(input: {
  title: string;
  description: string;
  listingType: string;
  address: string;
  priceLabel: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sizeSqm?: number | null;
  amenities: string[];
  imageUrls: string[];
  availabilityStatus: string;
}): Promise<ListingAiReviewResult> {
  const key = openaiKey();
  const imageCount = input.imageUrls.length;
  const thinCopy = input.description.trim().length < 80;
  const missingBasics =
    !input.title.trim() ||
    !input.address.trim() ||
    imageCount === 0 ||
    thinCopy;

  if (!key) {
    return {
      recommendation: "manual_review",
      confidence: 0,
      summary:
        "Listing AI is not configured — escalated to admin for human verification. Listings are never auto-approved.",
      reasons: [
        "OPENAI_API_KEY not set",
        missingBasics
          ? "Listing looks incomplete (photos/description/address)."
          : "Full admin review required.",
      ],
      requiresManualReview: true,
      completenessScore: missingBasics ? 0.35 : 0.6,
    };
  }

  const system = `You are a Nigerian property listing quality & fraud-risk reviewer for House In Hands.
Assess a landlord property upload. Return ONLY JSON:
{
  "recommendation": "approve" | "manual_review" | "reject",
  "confidence": number (0-1),
  "summary": string,
  "reasons": string[],
  "requiresManualReview": boolean,
  "completenessScore": number (0-1)
}
Rules:
- approve = listing looks complete and credible (still will NOT be published without human admin).
- manual_review = missing info, weak photos, unclear address, suspicious pricing, or uncertainty.
- reject = clear spam, scam signals, unrelated images, or grossly incomplete/fake listing.
- Prefer manual_review when unsure.
- occupied/management listings still need honest details and usable photos.
- Be practical for Nigerian rental markets (Lagos, Abuja, etc.).`;

  const userText = `Title: ${input.title}
Type: ${input.listingType}
Availability: ${input.availabilityStatus}
Address: ${input.address}
Price: ${input.priceLabel}
Beds: ${input.bedrooms ?? "n/a"} · Baths: ${input.bathrooms ?? "n/a"} · Size m²: ${input.sizeSqm ?? "n/a"}
Amenities: ${input.amenities.join(", ") || "none"}
Description: ${input.description.slice(0, 2500)}
Image count: ${imageCount}`;

  const content: Array<
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } }
  > = [{ type: "text", text: userText }];

  for (const url of input.imageUrls.slice(0, 4)) {
    content.push({ type: "image_url", image_url: { url } });
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
        temperature: 0.15,
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
        summary: `Listing AI provider error (${res.status}) — escalated to admin.`,
        reasons: ["Vision/text model request failed."],
        requiresManualReview: true,
        completenessScore: 0.4,
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

    const requiresManualReview =
      recommendation !== "approve" ||
      Boolean(parsed.requiresManualReview) ||
      clamp01(Number(parsed.confidence ?? 0)) < 0.85;

    return {
      recommendation,
      confidence: clamp01(Number(parsed.confidence ?? 0)),
      summary: String(
        parsed.summary ||
          "AI completed listing review. Admin confirmation still required."
      ),
      reasons: Array.isArray(parsed.reasons)
        ? parsed.reasons.map(String).slice(0, 12)
        : [],
      requiresManualReview,
      completenessScore: clamp01(Number(parsed.completenessScore ?? 0.5)),
    };
  } catch {
    return {
      recommendation: "manual_review",
      confidence: 0,
      summary: "Listing AI failed — escalated to admin for human verification.",
      reasons: ["Unexpected AI error."],
      requiresManualReview: true,
      completenessScore: 0.4,
    };
  }
}
