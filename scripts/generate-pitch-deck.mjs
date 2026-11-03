/**
 * House In Hands — DNICE 2026 / NITDA–NACCIMA Deal Room Pitch Deck
 * Comprehensive widescreen PDF with brand imagery.
 *
 * Run: node scripts/generate-pitch-deck.mjs
 */
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const brand = path.join(root, "public/brand");
const outPath = path.join(brand, "House-In-Hands-Pitch-Deck.pdf");

const W = 960;
const H = 540;

const C = {
  teal: "#008585",
  tealBright: "#00a6a6",
  tealSoft: "#d9f0f0",
  ink: "#0c0d0b",
  muted: "#5A6A7D",
  line: "#E2E8EE",
  white: "#FFFFFF",
  cream: "#F4F8F8",
  dark: "#0F2A3A",
  dark2: "#143645",
};

const IMG = {
  logo: path.join(brand, "logo-mark.png"),
  stress: path.join(brand, "renting-stress-campaign.jpg"),
  control: path.join(brand, "control-campaign.jpg"),
  dreamed: path.join(brand, "dreamed-it-campaign.jpg"),
  story: path.join(brand, "housing-story-campaign.jpg"),
  stakeholder: path.join(brand, "stakeholder-meeting-flyer.png"),
  signature: path.join(brand, "email-signature-compact.jpg"),
};

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function safeImage(doc, file, x, y, opts) {
  if (!exists(file)) return false;
  try {
    doc.image(file, x, y, opts);
    return true;
  } catch {
    return false;
  }
}

function footer(doc, n, total, dark = false) {
  doc.save();
  doc
    .moveTo(48, H - 36)
    .lineTo(W - 48, H - 36)
    .strokeColor(dark ? "#2a4a55" : C.line)
    .lineWidth(0.6)
    .stroke();
  doc
    .fillColor(dark ? "#8aa4ab" : C.muted)
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      "HOUSE IN HANDS LIMITED  ·  PROPERTY. IN YOUR HANDS.  ·  DNICE 2026 NITDA–NACCIMA DEAL ROOM",
      48,
      H - 26,
      { width: W - 140 }
    );
  doc.text(
    `${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`,
    W - 88,
    H - 26,
    { width: 48, align: "right" }
  );
  doc.restore();
}

function bg(doc, { dark = false } = {}) {
  doc.rect(0, 0, W, H).fill(dark ? C.dark : C.cream);
  if (!dark) doc.rect(0, 0, 8, H).fill(C.teal);
}

function eyebrow(doc, text, y = 28) {
  doc
    .fillColor(C.teal)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(text.toUpperCase(), 48, y, { characterSpacing: 1.4 });
}

function h1(doc, text, y = 48, opts = {}) {
  doc
    .fillColor(opts.color || C.ink)
    .font("Helvetica-Bold")
    .fontSize(opts.size || 26)
    .text(text, 48, y, { width: opts.width || W - 96 });
}

function p(doc, text, x, y, opts = {}) {
  doc
    .fillColor(opts.color || C.muted)
    .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(opts.size || 11)
    .text(text, x, y, {
      width: opts.width || W - 96,
      lineGap: opts.lineGap ?? 3,
      align: opts.align || "left",
    });
  return doc.y;
}

function card(doc, x, y, w, h, fill = C.white) {
  doc.save();
  doc.roundedRect(x, y, w, h, 10).fill(fill);
  doc.restore();
}

function chip(doc, x, y, label) {
  const w = Math.min(220, 18 + label.length * 6.2);
  doc.roundedRect(x, y, w, 22, 11).fill(C.tealSoft);
  doc
    .fillColor(C.teal)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text(label, x + 10, y + 7);
  return w;
}

/* ---------------- SLIDES ---------------- */

function slideCover(doc, total) {
  bg(doc, { dark: true });
  doc.rect(0, 0, W, H).fill(C.dark);

  // Right visual panel
  if (exists(IMG.dreamed)) {
    doc.save();
    doc.rect(520, 0, 440, H).clip();
    safeImage(doc, IMG.dreamed, 520, -40, { width: 480, height: 620 });
    doc.restore();
    doc.rect(520, 0, 440, H).fillOpacity(0.45).fill(C.dark);
    doc.fillOpacity(1);
  }
  doc.rect(0, H - 78, W, 78).fill(C.teal);

  safeImage(doc, IMG.logo, 48, 40, { width: 52 });

  doc
    .fillColor(C.tealSoft)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      "DNICE 2026  ·  NITDA–NACCIMA STARTUP DEAL ROOM & BUILDERS FESTIVAL",
      48,
      110,
      { characterSpacing: 1.1, width: 450 }
    );

  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(38)
    .text("House In Hands", 48, 148, { width: 450 });

  doc
    .fillColor(C.tealBright)
    .font("Helvetica-Bold")
    .fontSize(16)
    .text("Property. In Your Hands.", 48, 202);

  p(
    doc,
    "A deployment-ready Nigerian property technology platform connecting discovery, verification, agreements, payments, management and intelligence — built for landlords, tenants, managers, developers and investors.",
    48,
    236,
    { width: 440, size: 11.5, color: "#c5d4d8", lineGap: 4 }
  );

  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("FREE REGISTRATION  |  FREE PROPERTY LISTINGS", 48, H - 48, {
      characterSpacing: 1,
    });

  doc
    .fillColor(C.white)
    .font("Helvetica")
    .fontSize(10)
    .text("www.houseinhands.com", W - 220, H - 48, {
      width: 170,
      align: "right",
    });

  doc
    .fillColor("#9bb5b8")
    .fontSize(8)
    .text(`01 / ${String(total).padStart(2, "0")}`, W - 90, 40);
}

function slideAgenda(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  Agenda`);
  h1(doc, "What this deck covers");

  const left = [
    "Problem & market context",
    "Solution & connected ecosystem",
    "Product depth & live capabilities",
    "User journey & service pillars",
    "DNICE sector fit",
  ];
  const right = [
    "Deployment readiness",
    "Business model",
    "Differentiation",
    "Partnership & capital ask",
    "Mission, values & contact",
  ];

  left.forEach((t, i) => {
    const y = 110 + i * 62;
    card(doc, 48, y, 420, 52);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(String(i + 1).padStart(2, "0"), 68, y + 18);
    p(doc, t, 110, y + 18, { width: 330, size: 12, color: C.ink });
  });
  right.forEach((t, i) => {
    const y = 110 + i * 62;
    card(doc, 492, y, 420, 52);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(String(i + 6).padStart(2, "0"), 512, y + 18);
    p(doc, t, 554, y + 18, { width: 330, size: 12, color: C.ink });
  });

  footer(doc, n, total);
}

function slideOpportunity(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  The opportunity`);
  h1(doc, "Nigeria’s housing economy needs an operating system.");

  // Left image
  if (exists(IMG.story)) {
    doc.save();
    doc.roundedRect(48, 120, 360, 340, 12).clip();
    safeImage(doc, IMG.story, 48, 100, { width: 400, height: 400 });
    doc.restore();
  }

  const points = [
    {
      t: "Fragmented discovery",
      d: "Homes are found across informal networks, agents and unverified listings.",
    },
    {
      t: "Broken trust layer",
      d: "Identity, property claims and payment proof are hard to verify at scale.",
    },
    {
      t: "Ops still manual",
      d: "Rent collection, leases, maintenance and exits run on chats and spreadsheets.",
    },
    {
      t: "Digital demand is rising",
      d: "Landlords, tenants and managers want one connected journey — not more apps.",
    },
  ];

  points.forEach((pt, i) => {
    const y = 120 + i * 85;
    card(doc, 440, y, 472, 74);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(String(i + 1).padStart(2, "0"), 460, y + 16);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(pt.t, 500, y + 16, { width: 390 });
    p(doc, pt.d, 500, y + 38, { width: 390, size: 10 });
  });

  footer(doc, n, total);
}

function slideProblem(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  The problem`);
  h1(doc, "Renting and managing property is still painful.");

  if (exists(IMG.stress)) {
    doc.save();
    doc.roundedRect(520, 95, 392, 370, 12).clip();
    safeImage(doc, IMG.stress, 500, 70, { width: 450, height: 450 });
    doc.restore();
    doc.roundedRect(520, 95, 392, 370, 12).strokeColor(C.line).lineWidth(0.8).stroke();
  }

  const pains = [
    ["Tenants", "Opaque fees, weak documentation, hard exits, unreliable maintenance follow-through."],
    ["Landlords", "Occupancy tracking, collections, tenant onboarding and disputes remain labour-heavy."],
    ["Managers", "Portfolio coordination across payments, repairs and records lacks a single source of truth."],
    ["Market", "Low digital trust slows formalisation of an enormous real-estate economy."],
  ];

  pains.forEach((row, i) => {
    const y = 105 + i * 90;
    doc.rect(48, y, 6, 72).fill(C.teal);
    card(doc, 54, y, 440, 72);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(row[0], 74, y + 16);
    p(doc, row[1], 74, y + 38, { width: 400, size: 10.5 });
  });

  footer(doc, n, total);
}

function slideSolution(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  The solution`);
  h1(doc, "House In Hands — one connected property ecosystem.");

  p(
    doc,
    "We digitise the full property lifecycle: find or list homes, verify people and properties, agree digitally, pay rent/utilities, manage occupancy, raise issues, keep records — and use AI to assist without replacing human judgment on legal matters.",
    48,
    95,
    { width: 560, size: 12, color: C.ink, lineGap: 4 }
  );

  if (exists(IMG.control)) {
    doc.save();
    doc.roundedRect(640, 90, 272, 360, 12).clip();
    safeImage(doc, IMG.control, 620, 70, { width: 320, height: 420 });
    doc.restore();
  }

  const ecos = [
    ["01 People", "Landlords, tenants, students, estate managers, investors"],
    ["02 Properties", "Vacant marketplace homes + already-occupied managed assets"],
    ["03 Payments", "Rent, dues, utilities, wallet, receipts and audits"],
    ["04 Services", "Maintenance, building issues, exits, support workflows"],
    ["05 Intelligence", "AI review, assistants, records and operational insight"],
  ];

  ecos.forEach((e, i) => {
    const y = 175 + i * 52;
    card(doc, 48, y, 560, 46);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(e[0], 64, y + 16);
    p(doc, e[1], 160, y + 16, { width: 420, size: 11, color: C.ink });
  });

  footer(doc, n, total);
}

function slideProductLive(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  Live product`);
  h1(doc, "Deployment-ready platform capabilities");

  p(
    doc,
    "House In Hands is not a concept deck — core product surfaces are live and expanding toward scale.",
    48,
    92,
    { width: 860, size: 11, color: C.ink }
  );

  const caps = [
    ["Marketplace", "Verified public listings, SEO discovery, apply flows"],
    ["KYC & trust", "In-house AI + admin review for identity/profile verification"],
    ["Leases & docs", "Digital agreements, e-sign paths, document retention"],
    ["Payments", "Paystack rent/utilities, receipts, wallet rails"],
    ["Occupied onboard", "Invite current tenants into managed properties"],
    ["My Home hub", "Tenant view of costs, docs, bills, messages, exits"],
    ["Exit notices", "AI screen + human legal/ops review + refund workflow"],
    ["Building issues", "AI Property Manager triage with landlord escalation"],
    ["AI assistants", "Public Ask AI + portal assistant (multi-language)"],
    ["Admin & RBAC", "Ops console for KYC, listings, fraud, content, emails"],
    ["Comms", "In-app messages, email, push notifications"],
    ["Brand & CMS", "Website content, waitlist, outreach tooling"],
  ];

  caps.forEach((c, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 48 + col * 300;
    const y = 125 + row * 88;
    card(doc, x, y, 284, 76);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(c[0], x + 16, y + 16, { width: 250 });
    p(doc, c[1], x + 16, y + 38, { width: 250, size: 9.5 });
  });

  footer(doc, n, total);
}

function slideJourney(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  How it works`);
  h1(doc, "A clear path from signup to operations");

  const steps = [
    ["01", "Register", "Create an account — free to join."],
    ["02", "Profile", "Landlord, tenant, student or estate manager (multi-profile)."],
    ["03", "Verify", "KYC with NIN/selfie; CAC for managers; student ID where needed."],
    ["04", "Activate", "List, manage, pay, message, maintain — pick the services you need."],
    ["05", "Operate", "Collections, issues, exits and records stay in one auditable system."],
  ];

  steps.forEach((s, i) => {
    const x = 48 + i * 180;
    card(doc, x, 130, 168, 280);
    doc.circle(x + 84, 190, 28).fill(C.teal);
    doc
      .fillColor(C.white)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(s[0], x + 64, 183, { width: 40, align: "center" });
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(s[1], x + 14, 240, { width: 140, align: "center" });
    p(doc, s[2], x + 14, 270, { width: 140, size: 10, align: "center" });
    if (i < steps.length - 1) {
      doc
        .fillColor(C.tealBright)
        .font("Helvetica-Bold")
        .fontSize(18)
        .text("→", x + 158, 178);
    }
  });

  footer(doc, n, total);
}

function slideServices(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  Service model`);
  h1(doc, "Nine pillars across the property lifecycle");

  p(
    doc,
    "Modular by design: every service can stand alone. Landlords can manage already-occupied assets without listing; others adopt only what they need.",
    48,
    92,
    { width: 860, size: 11, color: C.ink }
  );

  const services = [
    ["01", "Property marketplace", "Discover, list and explore verified homes."],
    ["02", "Property management", "Organise operations, statuses and records."],
    ["03", "Tenant & occupancy", "Applications, leases, invites, occupancy."],
    ["04", "Rent & payments", "Rent, dues, utilities, receipts, wallet."],
    ["05", "Maintenance & services", "Requests, repairs, inspections, support."],
    ["06", "Property-as-a-Service", "Operational support for stakeholders."],
    ["07", "Data & intelligence", "Property information and market insight."],
    ["08", "Developer & investor", "Inventory visibility and project promotion."],
    ["09", "Digital records", "Property, tenancy, payment and maintenance history."],
  ];

  services.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 48 + col * 300;
    const y = 135 + row * 110;
    card(doc, x, y, 284, 96);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(s[0], x + 16, y + 16);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(s[1], x + 16, y + 38, { width: 250 });
    p(doc, s[2], x + 16, y + 60, { width: 250, size: 9.5 });
  });

  footer(doc, n, total);
}

function slideSectorFit(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  DNICE 2026 sector fit`);
  h1(doc, "Aligned to NITDA–NACCIMA focus sectors");

  p(
    doc,
    "Primary categories for this application — with clear product evidence already shipping.",
    48,
    92,
    { width: 860, size: 11, color: C.ink }
  );

  const sectors = [
    {
      t: "FinTech & Digital Commerce",
      d: "Rent/utility payments, wallet, receipts, formal digital commerce for housing transactions.",
    },
    {
      t: "Infrastructure & Cloud Platforms",
      d: "A multi-sided operating platform for discovery, tenancy ops, records and stakeholder workflows.",
    },
    {
      t: "AI-Native Systems",
      d: "KYC AI, listing review, building-issue triage, portal/public assistants (multi-language).",
    },
    {
      t: "Cybersecurity, Privacy & Digital Trust",
      d: "Identity verification, verified listings, RBAC admin, audit trails and accountable messaging.",
    },
  ];

  sectors.forEach((s, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 48 + col * 450;
    const y = 130 + row * 160;
    card(doc, x, y, 430, 140, i % 2 === 0 ? C.white : C.tealSoft);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(String(i + 1).padStart(2, "0"), x + 22, y + 24);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(s.t, x + 22, y + 48, { width: 380 });
    p(doc, s.d, x + 22, y + 78, { width: 380, size: 11 });
  });

  footer(doc, n, total);
}

function slideReadiness(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  Deployment readiness`);
  h1(doc, "Eligible and ready for Deal Room engagement");

  const checks = [
    ["Registered Nigerian business", "House In Hands Limited — CAC documentation available for TWG review."],
    ["MVP / live product", "Public site + authenticated portal with marketplace, KYC, payments, leases, AI tools."],
    ["Focus-sector technology", "FinTech/commerce, cloud infrastructure, AI-native workflows, digital trust."],
    ["Physical attendance", "Team available for DNICE 2026 Builders Festival, Abuja — 10–12 November 2026."],
    ["Pilot-ready B2B use cases", "Estate managers, landlords, developers and corporate housing programmes."],
    ["Trust & compliance path", "KYC, verification gates, audit logs; Digital Trust Mark pathway interest."],
  ];

  checks.forEach((c, i) => {
    const y = 105 + i * 58;
    doc.circle(62, y + 18, 10).fill(C.teal);
    doc
      .fillColor(C.white)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("✓", 57, y + 13);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(c[0], 88, y + 6, { width: 820 });
    p(doc, c[1], 88, y + 26, { width: 820, size: 10 });
  });

  footer(doc, n, total);
}

function slideBusinessModel(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  Business model`);
  h1(doc, "Land free. Monetise trust, transactions and ops.");

  p(
    doc,
    "Growth starts with free registration and free property listings — then expands into high-intent monetisation as users transact and operate on-platform.",
    48,
    95,
    { width: 860, size: 11, color: C.ink }
  );

  const models = [
    ["Transaction fees", "Agreement fees, payment rails and successful housing transactions."],
    ["Managed services", "Assisted / fully managed packages for landlords and estate operators."],
    ["SaaS / portfolio ops", "Advanced management, analytics and multi-unit tooling over time."],
    ["Value-added services", "Maintenance coordination, utilities, premium verification & support."],
    ["B2B / enterprise", "Developer inventory, corporate housing, off-take style partnerships."],
    ["Data products (later)", "Anonymised market intelligence for serious operators and investors."],
  ];

  models.forEach((m, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 48 + col * 300;
    const y = 150 + row * 150;
    card(doc, x, y, 284, 130);
    doc.rect(x, y, 284, 8).fill(C.teal);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(m[0], x + 18, y + 30, { width: 248 });
    p(doc, m[1], x + 18, y + 58, { width: 248, size: 11 });
  });

  footer(doc, n, total);
}

function slideDifferentiation(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  Differentiation`);
  h1(doc, "Not another listings site.");

  if (exists(IMG.stakeholder)) {
    doc.save();
    doc.roundedRect(560, 110, 352, 340, 12).clip();
    safeImage(doc, IMG.stakeholder, 540, 90, { width: 400, height: 400 });
    doc.restore();
  }

  const diffs = [
    ["Full lifecycle OS", "Discovery through payments, occupancy, maintenance and exit — not ads alone."],
    ["Occupied + vacant", "Manage real portfolios already rented; invite tenants into digital workflows."],
    ["Trust stack", "KYC AI, listing verification, admin escalation, auditability."],
    ["AI with guardrails", "Assists ops and messaging; legal decisions stay human-reviewed where required."],
    ["Nigeria-first UX", "Local payments, multilingual AI replies, free entry to reduce adoption friction."],
    ["B2B expandable", "Estate managers, developers and corporate buyers can plug into the same rails."],
  ];

  diffs.forEach((d, i) => {
    const y = 110 + i * 55;
    card(doc, 48, y, 480, 48);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(d[0], 64, y + 16);
    p(doc, d[1], 190, y + 16, { width: 320, size: 10, color: C.ink });
  });

  footer(doc, n, total);
}

function slideAsk(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  The ask`);
  h1(doc, "What we seek from DNICE 2026");

  p(
    doc,
    "We are applying to scale deployment — not to prototype. Our objectives align with Deal Room outcomes: capital, contracts and industrial partnerships.",
    48,
    92,
    { width: 860, size: 11, color: C.ink }
  );

  const asks = [
    {
      t: "Domestic capital",
      d: "Engage top-tier Nigerian investors and financiers seeking home-grown infrastructure for housing & commerce.",
    },
    {
      t: "B2B off-take & pilots",
      d: "Pilot with NACCIMA corporate members — estate operators, developers, employers and property-linked manufacturers.",
    },
    {
      t: "Distribution & exhibition",
      d: "Showcase at the NITDA–NACCIMA pavilion to policymakers, corporates and partners.",
    },
    {
      t: "Trust acceleration",
      d: "Pursue Digital Trust Mark pathway for compliant growth and cross-border readiness.",
    },
  ];

  asks.forEach((a, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 48 + col * 450;
    const y = 140 + row * 150;
    card(doc, x, y, 430, 130, C.white);
    doc.rect(x, y, 8, 130).fill(C.teal);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(a.t, x + 28, y + 28, { width: 370 });
    p(doc, a.d, x + 28, y + 58, { width: 370, size: 11 });
  });

  footer(doc, n, total);
}

function slideMission(doc, n, total) {
  bg(doc);
  eyebrow(doc, `${String(n).padStart(2, "0")}  ·  Mission, vision & values`);
  h1(doc, "Why we build");

  card(doc, 48, 110, 420, 160);
  doc
    .fillColor(C.teal)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("MISSION", 70, 130, { characterSpacing: 1.5 });
  p(
    doc,
    "Make housing transactions and property management simpler, more transparent and more accessible by connecting people, properties, payments, services and data.",
    70,
    160,
    { width: 370, size: 12, color: C.ink, lineGap: 4 }
  );

  card(doc, 492, 110, 420, 160, C.teal);
  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("VISION", 514, 130, { characterSpacing: 1.5 });
  doc
    .fillColor(C.white)
    .font("Helvetica")
    .fontSize(12)
    .text(
      "Become Africa’s most trusted and intelligent property technology ecosystem.",
      514,
      160,
      { width: 370, lineGap: 4 }
    );

  const vals = ["Trust", "Transparency", "Innovation", "Ownership", "People First"];
  vals.forEach((v, i) => {
    const x = 48 + i * 178;
    card(doc, x, 300, 168, 140);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(20)
      .text(String(i + 1).padStart(2, "0"), x + 18, 325);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(v, x + 18, 370, { width: 130 });
  });

  footer(doc, n, total);
}

function slideClose(doc, n, total) {
  bg(doc, { dark: true });
  doc.rect(0, 0, W, H).fill(C.dark);

  if (exists(IMG.signature)) {
    safeImage(doc, IMG.signature, 520, 160, { width: 380 });
  }

  safeImage(doc, IMG.logo, 48, 48, { width: 48 });

  doc
    .fillColor(C.tealBright)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("THANK YOU  ·  DNICE 2026", 48, 120, { characterSpacing: 1.4 });

  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(30)
    .text("Let’s put property\nin more hands.", 48, 150, { width: 440 });

  p(
    doc,
    "House In Hands Limited is ready for technical review, shortlisting and live Deal Room conversations in Abuja.",
    48,
    240,
    { width: 440, size: 12, color: "#c5d4d8", lineGap: 4 }
  );

  const rows = [
    ["Website", "www.houseinhands.com"],
    ["Email", "noreply@houseinhands.com"],
    ["Event", "NITDA–NACCIMA Deal Room · 10–12 Nov 2026 · Abuja"],
    ["Apply portal", "investment.naccima.ng"],
  ];

  rows.forEach((r, i) => {
    const y = 310 + i * 36;
    doc
      .fillColor(C.tealBright)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(r[0].toUpperCase(), 48, y);
    doc
      .fillColor(C.white)
      .font("Helvetica")
      .fontSize(12)
      .text(r[1], 150, y, { width: 360 });
  });

  doc.rect(0, H - 40, W, 40).fill(C.teal);
  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text("Housing you can trust  ·  Property. In Your Hands.", 48, H - 26);

  doc
    .fillColor(C.white)
    .fontSize(8)
    .text(`${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, W - 90, H - 26);
}

async function main() {
  const slides = [
    slideCover,
    slideAgenda,
    slideOpportunity,
    slideProblem,
    slideSolution,
    slideProductLive,
    slideJourney,
    slideServices,
    slideSectorFit,
    slideReadiness,
    slideBusinessModel,
    slideDifferentiation,
    slideAsk,
    slideMission,
    slideClose,
  ];
  const total = slides.length;

  const doc = new PDFDocument({
    size: [W, H],
    margin: 0,
    info: {
      Title: "House In Hands — DNICE 2026 Pitch Deck",
      Author: "House In Hands Limited",
      Subject:
        "NITDA–NACCIMA Startup Deal Room & Builders Festival 2026 application deck",
      Keywords:
        "House In Hands, DNICE, NACCIMA, NITDA, PropTech, Nigeria, Deal Room",
    },
  });

  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  slides.forEach((fn, i) => {
    if (i > 0) doc.addPage({ size: [W, H], margin: 0 });
    fn(doc, i + 1, total);
  });

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
  console.log(`Wrote ${outPath} (${total} slides)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
