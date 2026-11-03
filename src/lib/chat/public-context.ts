import { connectDB } from "@/lib/db";
import { FAQ_SECTIONS } from "@/lib/faq-content";
import { FaqItem } from "@/models/FaqItem";
import { Listing } from "@/models/Listing";

export async function buildPublicChatContext(query: string) {
  await connectDB();
  const q = query.toLowerCase();

  const staticFaq = FAQ_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      source: `FAQ · ${section.title}`,
      text: `Q: ${item.q}\nA: ${item.a}`,
    }))
  );

  const cmsFaqs = await FaqItem.find({ published: true })
    .sort({ order: 1 })
    .limit(40)
    .lean()
    .catch(() => []);

  const cmsBlocks = cmsFaqs.map((f) => ({
    source: "FAQ · CMS",
    text: `Q: ${f.question}\nA: ${f.answer}`,
  }));

  const listings = await Listing.find({
    availabilityStatus: "available",
    verificationStatus: "verified",
  })
    .sort({ featured: -1, publishedAt: -1 })
    .limit(25)
    .select("title description address price listingType bedrooms bathrooms amenities")
    .lean();

  const listingBlocks = listings.map((l) => ({
    source: `Listing · ${l.title}`,
    text: [
      `Title: ${l.title}`,
      `Type: ${l.listingType}`,
      `Location: ${l.address.street}, ${l.address.city}, ${l.address.state}`,
      `Rent: ${l.price.currency} ${l.price.amount}/${l.price.period}`,
      l.bedrooms != null ? `Bedrooms: ${l.bedrooms}` : "",
      l.bathrooms != null ? `Bathrooms: ${l.bathrooms}` : "",
      (l.amenities || []).length
        ? `Amenities: ${(l.amenities || []).slice(0, 12).join(", ")}`
        : "",
      `Summary: ${(l.description || "").slice(0, 280)}`,
    ]
      .filter(Boolean)
      .join("\n"),
  }));

  const platformBlocks = [
    {
      source: "Platform overview",
      text: [
        "House In Hands (House In Hand) is a Nigerian property technology platform: Property. In Your Hands.",
        "It helps people find homes, apply, sign digital agreements, pay rent/utilities, raise maintenance/building issues, and manage tenancies.",
        "Landlords can list vacant homes, onboard occupied properties, invite current tenants, collect rent, and manage exit notices.",
        "Listings are AI-reviewed and require admin verification before marketplace visibility.",
        "Key areas: marketplace search, applications, agreements, payments, utilities, maintenance, building issues (AI Property Manager), My Home, exit notices, KYC.",
        "Pricing and fees are disclosed in-product before commitment. Tenant registration is intended to be free.",
      ].join(" "),
    },
  ];

  const all = [...platformBlocks, ...staticFaq, ...cmsBlocks, ...listingBlocks];

  // Light relevance: prefer blocks that share query tokens
  const tokens = q
    .split(/[^a-z0-9]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
  const scored = all
    .map((block) => {
      const hay = `${block.source} ${block.text}`.toLowerCase();
      const score = tokens.reduce(
        (acc, t) => acc + (hay.includes(t) ? 1 : 0),
        0
      );
      return { ...block, score };
    })
    .sort((a, b) => b.score - a.score);

  const selected =
    scored.filter((b) => b.score > 0).slice(0, 14).length > 0
      ? scored.filter((b) => b.score > 0).slice(0, 14)
      : scored.slice(0, 10);

  return selected
    .map((b, i) => `[${i + 1}] (${b.source})\n${b.text}`)
    .join("\n\n")
    .slice(0, 12000);
}

export const PUBLIC_CHAT_SYSTEM = `You are the House In Hands website assistant for a Nigerian property platform.
Answer questions about House In Hands, how the platform works, verified public listings in context, pricing concepts, and property search guidance.

Rules:
- Use ONLY the provided CONTEXT plus general safe knowledge about renting in Nigeria when helpful.
- If context lacks a specific listing or fee, say so and suggest browsing /listings or creating an account.
- Do not invent availability, exact fees, or private landlord/tenant data.
- Do not give legal advice. For legal questions, suggest reviewing the in-app agreement and consulting a qualified lawyer.
- Keep answers concise, friendly, and practical (short paragraphs or bullets).
- When mentioning a listing from context, include city/state and rent if available.
- If asked about something unrelated to housing/platform, briefly redirect to House In Hands topics.`;
