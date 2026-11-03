import { DEFAULT_PLATFORM_FEES } from "@/lib/platform-fees";

function ctaButton(href: string, label: string) {
  return `
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 4px;">
  <tr>
    <td style="border-radius:6px;background:#00A6A6;">
      <a href="${href}" style="display:inline-block;padding:12px 24px;font-family:Inter,Arial,Helvetica,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">
        ${label}
      </a>
    </td>
  </tr>
</table>`.trim();
}

export const OUTREACH_TEMPLATE_IDS = [
  "services_offers",
  "talent_recruit",
  "investor_pitch",
] as const;

export type OutreachTemplateId = (typeof OUTREACH_TEMPLATE_IDS)[number];

export type OutreachTemplate = {
  id: OutreachTemplateId;
  category: "growth" | "talent" | "investors";
  label: string;
  description: string;
  subject: string;
  /** Inner HTML — wrapped in branded shell on send. Supports {{name}}, {{email}}, etc. */
  html: string;
};

const agreementPct = DEFAULT_PLATFORM_FEES.agreementFeePercent;
const platformPct = DEFAULT_PLATFORM_FEES.platformFeeMinPercent;

export const OUTREACH_TEMPLATES: OutreachTemplate[] = [
  {
    id: "services_offers",
    category: "growth",
    label: "Services & offers",
    description:
      "Introduce House In Hands — house hunting, digital tenancy and property management for Nigeria.",
    subject: "House In Hands — housing you can trust across Nigeria",
    html: `
<p style="margin:0 0 16px;">Hi {{name}},</p>
<p style="margin:0 0 16px;">I’m reaching out from <strong>House In Hands</strong> — Nigeria’s property technology platform for trusted house hunting, verified participation and clearer digital tenancy.</p>
<p style="margin:0 0 8px;"><strong>What we offer</strong></p>
<ul style="margin:0 0 16px;padding-left:20px;color:#1B2A41;">
  <li style="margin-bottom:8px;"><strong>House hunting</strong> — browse verified homes across Lagos, Abuja, Ogun, Oyo and every state, with clearer listing details before you commit.</li>
  <li style="margin-bottom:8px;"><strong>For tenants &amp; students</strong> — free to start, search and apply. No traditional agent-commission surprises on the direct rental workflow.</li>
  <li style="margin-bottom:8px;"><strong>For landlords &amp; managers</strong> — list, verify, collect rent, track occupancy and maintenance in one workspace. Choose DIY / Self-Managed, Assisted, or Fully Managed support.</li>
  <li style="margin-bottom:8px;"><strong>Digital agreements &amp; payments</strong> — rent, agreement/legal fees and platform fees shown upfront (default agreement fee ${agreementPct}% when HIH handles legal; from ${platformPct}% platform fee if you use your own legal partner).</li>
  <li style="margin-bottom:8px;"><strong>Property services</strong> — maintenance workflows, documents, portfolio visibility and optional management packages as you grow.</li>
</ul>
<p style="margin:0 0 16px;">Our promise is simple: <em>Property. In Your Hands.</em> — less opaque fees, fewer fragmented chats, more trust.</p>
${ctaButton("{{appUrl}}/register", "Create a free account")}
<p style="margin:16px 0 0;font-size:14px;color:#5A6A7D;">Explore <a href="{{appUrl}}/about" style="color:#008585;">why House In Hands</a>, <a href="{{appUrl}}/pricing" style="color:#008585;">pricing</a> and <a href="{{appUrl}}/house-hunting" style="color:#008585;">house hunting</a> — or reply to this email and we’ll walk you through it.</p>
<p style="margin:20px 0 0;">Warm regards,<br/>The House In Hands team<br/><a href="mailto:noreply@houseinhands.com" style="color:#008585;">noreply@houseinhands.com</a></p>
`.trim(),
  },
  {
    id: "talent_recruit",
    category: "talent",
    label: "Talent & creators",
    description:
      "Invite content creators, social media managers and other talent to join House In Hands.",
    subject: "Join House In Hands — roles for creators, social & growth talent",
    html: `
<p style="margin:0 0 16px;">Hi {{name}},</p>
<p style="margin:0 0 16px;">House In Hands is building Nigeria’s trusted property platform — and we’re looking for people who can help more landlords and tenants discover clearer, safer house hunting.</p>
<p style="margin:0 0 8px;"><strong>Roles we’re opening conversations for</strong></p>
<ul style="margin:0 0 16px;padding-left:20px;color:#1B2A41;">
  <li style="margin-bottom:8px;"><strong>Content creators</strong> — short-form video, storytelling and educational content about renting, listing and property trust in Nigeria.</li>
  <li style="margin-bottom:8px;"><strong>Social media managers</strong> — community growth, campaign calendars, engagement and brand voice across Instagram, TikTok, X and LinkedIn.</li>
  <li style="margin-bottom:8px;"><strong>Community &amp; partnerships</strong> — campus, estate and landlord-network outreach.</li>
  <li style="margin-bottom:8px;"><strong>Design &amp; brand</strong> — visual systems for campaigns, listings education and stakeholder events.</li>
  <li style="margin-bottom:8px;"><strong>Growth &amp; product marketing</strong> — landing pages, SEO narratives, referral loops and onboarding messaging.</li>
  <li style="margin-bottom:8px;"><strong>Customer success / support</strong> — help tenants and landlords move from enquiry to signed digital tenancy with clarity.</li>
</ul>
<p style="margin:0 0 16px;">If you’re creative, reliable and care about fixing broken property experiences in Nigeria, we’d love to hear how you work — portfolio, channels, rates or availability.</p>
${ctaButton("mailto:noreply@houseinhands.com?subject=Talent%20enquiry%20-%20House%20In%20Hands", "Reply with your profile")}
<p style="margin:16px 0 0;font-size:14px;color:#5A6A7D;">Learn more at <a href="{{appUrl}}/about" style="color:#008585;">{{appUrl}}/about</a>. Or simply reply to this email.</p>
<p style="margin:20px 0 0;">Looking forward,<br/>House In Hands Talent &amp; Growth<br/><a href="mailto:noreply@houseinhands.com" style="color:#008585;">noreply@houseinhands.com</a></p>
`.trim(),
  },
  {
    id: "investor_pitch",
    category: "investors",
    label: "Investor outreach",
    description:
      "High-level investor email covering problem, product, market and conversation ask.",
    subject: "House In Hands — proptech for trusted housing in Nigeria",
    html: `
<p style="margin:0 0 16px;">Dear {{name}},</p>
<p style="margin:0 0 16px;">I’m writing to introduce <strong>House In Hands</strong>, a Nigeria-focused property technology company building trusted infrastructure for house hunting, digital tenancy and property management.</p>
<p style="margin:0 0 8px;"><strong>The problem</strong></p>
<p style="margin:0 0 16px;">Finding and managing homes in Nigeria is still fragmented — opaque fees, unverified intermediaries, scattered WhatsApp threads and weak digital records. Tenants lose trust. Landlords lose time. Portfolios stay under-instrumented.</p>
<p style="margin:0 0 8px;"><strong>What we’re building</strong></p>
<ul style="margin:0 0 16px;padding-left:20px;color:#1B2A41;">
  <li style="margin-bottom:8px;">A verified marketplace for rentals across Lagos, Abuja and nationwide.</li>
  <li style="margin-bottom:8px;">Digital applications, agreements and rent workflows with fees disclosed before commitment.</li>
  <li style="margin-bottom:8px;">Landlord software plus Assisted and Fully Managed service tiers.</li>
  <li style="margin-bottom:8px;">A path to property intelligence — occupancy, pricing signals and portfolio performance as the network grows.</li>
</ul>
<p style="margin:0 0 8px;"><strong>Business model (transparent, usage-aligned)</strong></p>
<p style="margin:0 0 16px;">Tenants start free. Monetisation centres on agreement/legal facilitation (default ${agreementPct}% when HIH handles legal), small platform fees (from ${platformPct}% with own legal), and management packages for owners who want operational support — all shown before payment.</p>
<p style="margin:0 0 8px;"><strong>Why now</strong></p>
<p style="margin:0 0 16px;">Urban housing demand, smartphone adoption and appetite for trusted digital payments create room for a category-defining Nigerian proptech brand — not another classifieds board.</p>
<p style="margin:0 0 16px;">If this sits in your thesis (proptech, fintech-adjacent infrastructure, African consumer platforms), I’d welcome a short conversation — product walkthrough, traction snapshot and how we think about capital.</p>
${ctaButton("{{appUrl}}/about", "View House In Hands")}
<p style="margin:16px 0 0;font-size:14px;color:#5A6A7D;">Reply to this email or write <a href="mailto:noreply@houseinhands.com" style="color:#008585;">noreply@houseinhands.com</a>. Happy to share a deck and data room materials on request.</p>
<p style="margin:20px 0 0;">Respectfully,<br/>House In Hands<br/><a href="{{appUrl}}" style="color:#008585;">{{appUrl}}</a></p>
`.trim(),
  },
];

export function getOutreachTemplate(id: string): OutreachTemplate | null {
  return OUTREACH_TEMPLATES.find((t) => t.id === id) || null;
}
