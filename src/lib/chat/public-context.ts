import { connectDB } from "@/lib/db";
import { FAQ_SECTIONS } from "@/lib/faq-content";
import { FaqItem } from "@/models/FaqItem";

/** FAQ + platform overview only. Listings come from the search_listings tool. */
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

  const platformBlocks = [
    {
      source: "Platform overview",
      text: [
        "House In Hands (House In Hand) is a Nigerian property technology platform: Property. In Your Hands.",
        "It helps people find homes, apply, sign digital agreements, pay rent/utilities, raise maintenance/building issues, and manage tenancies.",
        "Landlords can list vacant homes, onboard occupied properties, invite current tenants, collect rent, and manage exit notices.",
        "Public listings are verified before they appear on the marketplace.",
        "Users can browse /listings and open /listings/{id} for a specific home.",
      ].join(" "),
    },
  ];

  const all = [...platformBlocks, ...staticFaq, ...cmsBlocks];
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
    scored.filter((b) => b.score > 0).slice(0, 12).length > 0
      ? scored.filter((b) => b.score > 0).slice(0, 12)
      : scored.slice(0, 8);

  return selected
    .map((b, i) => `[${i + 1}] (${b.source})\n${b.text}`)
    .join("\n\n")
    .slice(0, 8000);
}

export const PUBLIC_CHAT_SYSTEM = `You are the House In Hands website assistant for a Nigerian property platform.

You have ONE database tool: search_listings — it queries ONLY verified public properties available for rent. You must use it whenever users ask for homes, apartments, hostels, rentals, listings, or properties in a place (Lagos, Abuja, etc.).

Rules:
- When the user asks for available listings, CALL search_listings (e.g. city/state "Lagos") and present the returned homes clearly: title, area, rent, beds, and the listing url.
- Do NOT say you cannot provide listings if the tool returned results. Summarise those results.
- If the tool returns count 0, say none are live for that filter right now and suggest /listings or broadening the search.
- Never invent listings. Only use tool results + FAQ/platform CONTEXT.
- Do not access or invent private user, payment, lease, or landlord contact data. The tool only returns public property fields.
- Do not give legal advice.
- Keep answers concise and practical. Prefer short bullets for listing results.
- If asked something unrelated to housing/platform, briefly redirect to House In Hands topics.`;
