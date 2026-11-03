/**
 * House In Hands — Investor / Partner Pitch Deck (PDF)
 * Design cues from company profile: teal system, numbered slides,
 * "Property. In Your Hands." footer, clean typography.
 *
 * Run: node scripts/generate-pitch-deck.mjs
 */
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "public/brand/House-In-Hands-Pitch-Deck.pdf");
const logoPath = path.join(root, "public/brand/logo-mark.png");

// Widescreen 16:9 (points)
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
  cream: "#F7FAFA",
  dark: "#0F2A3A",
};

function footer(doc, pageNum, total) {
  doc.save();
  doc
    .fillColor(C.muted)
    .fontSize(8)
    .font("Helvetica")
    .text("HOUSE IN HANDS  ·  PROPERTY. IN YOUR HANDS.", 48, H - 28, {
      width: W - 160,
      align: "left",
    });
  doc.text(`${String(pageNum).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, W - 90, H - 28, {
    width: 50,
    align: "right",
  });
  doc
    .moveTo(48, H - 40)
    .lineTo(W - 48, H - 40)
    .strokeColor(C.line)
    .lineWidth(0.6)
    .stroke();
  doc.restore();
}

function slideBg(doc, { dark = false } = {}) {
  doc.rect(0, 0, W, H).fill(dark ? C.dark : C.cream);
  if (!dark) {
    doc.rect(0, 0, 10, H).fill(C.teal);
  }
}

function eyebrow(doc, text, y = 40) {
  doc
    .fillColor(C.teal)
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(text.toUpperCase(), 48, y, { characterSpacing: 1.5 });
}

function title(doc, text, y = 62) {
  doc
    .fillColor(C.ink)
    .font("Helvetica-Bold")
    .fontSize(28)
    .text(text, 48, y, { width: W - 96 });
}

function body(doc, text, x, y, opts = {}) {
  doc
    .fillColor(opts.color || C.muted)
    .font(opts.bold ? "Helvetica-Bold" : "Helvetica")
    .fontSize(opts.size || 12)
    .text(text, x, y, {
      width: opts.width || W - 96,
      lineGap: opts.lineGap ?? 4,
      align: opts.align || "left",
    });
  return doc.y;
}

function card(doc, x, y, w, h, opts = {}) {
  doc.save();
  doc.roundedRect(x, y, w, h, 10).fill(opts.fill || C.white);
  if (opts.border !== false) {
    doc
      .roundedRect(x, y, w, h, 10)
      .strokeColor(opts.borderColor || C.line)
      .lineWidth(0.8)
      .stroke();
  }
  doc.restore();
}

function drawCover(doc, total) {
  slideBg(doc, { dark: true });
  doc.rect(0, 0, W, H).fill(C.dark);
  // accent band
  doc.rect(0, H - 90, W, 90).fill(C.teal);

  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, 48, 48, { width: 56 });
    } catch {
      /* ignore */
    }
  }

  doc
    .fillColor(C.tealSoft)
    .font("Helvetica")
    .fontSize(11)
    .text("PITCH DECK  ·  2026", 48, 120, { characterSpacing: 2 });

  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(42)
    .text("House In Hands", 48, 150, { width: 700 });

  doc
    .fillColor(C.tealBright)
    .font("Helvetica-Bold")
    .fontSize(18)
    .text("Property. In Your Hands.", 48, 210);

  doc
    .fillColor("#c5d4d8")
    .font("Helvetica")
    .fontSize(13)
    .text(
      "Nigeria’s connected property technology ecosystem — discovery, verification,\nagreements, payments, management and intelligence in one platform.",
      48,
      250,
      { width: 620, lineGap: 5 }
    );

  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text("FREE REGISTRATION  |  FREE PROPERTY LISTINGS", 48, H - 58, {
      characterSpacing: 1.2,
    });

  doc
    .fillColor(C.white)
    .font("Helvetica")
    .fontSize(10)
    .text("www.houseinhands.com", W - 220, H - 56, { width: 170, align: "right" });

  doc
    .fillColor("#9bb5b8")
    .fontSize(8)
    .text(`01 / ${String(total).padStart(2, "0")}`, W - 90, 48);
}

function drawProblem(doc, page, total) {
  slideBg(doc);
  eyebrow(doc, `0${page}  ·  The problem`);
  title(doc, "Housing is fragmented.");

  const points = [
    {
      t: "Hard to find trusted homes",
      d: "People search across many channels, middlemen and incomplete listings.",
    },
    {
      t: "Complicated rental journeys",
      d: "Applications, agreements, payments and records live in different places.",
    },
    {
      t: "Heavy landlord admin",
      d: "Collections, tenants, maintenance and documentation stay manual and opaque.",
    },
    {
      t: "Weak coordination",
      d: "Managers, developers and investors struggle to act on clear property data.",
    },
  ];

  points.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 48 + col * 440;
    const y = 140 + row * 140;
    card(doc, x, y, 420, 120);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(22)
      .text(String(i + 1).padStart(2, "0"), x + 20, y + 22);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(p.t, x + 70, y + 28, { width: 320 });
    body(doc, p.d, x + 70, y + 52, { width: 320, size: 11 });
  });

  footer(doc, page, total);
}

function drawSolution(doc, page, total) {
  slideBg(doc);
  eyebrow(doc, `0${page}  ·  The solution`);
  title(doc, "One connected property ecosystem.");

  body(
    doc,
    "House In Hands brings people, properties, payments, services and property intelligence into one digital platform — so Nigerians can find, agree, pay for and manage homes with clearer costs and digital records.",
    48,
    110,
    { width: 860, size: 13, color: C.ink }
  );

  const pillars = [
    ["People", "Landlords, tenants,\nstudents, managers"],
    ["Properties", "Homes, land &\ncommercial spaces"],
    ["Payments", "Rent, dues &\nutilities"],
    ["Services", "Maintenance &\noperations"],
    ["Intelligence", "Records &\nproperty insight"],
  ];

  pillars.forEach((p, i) => {
    const x = 48 + i * 178;
    card(doc, x, 220, 168, 170, { fill: i % 2 === 0 ? C.white : C.tealSoft, border: false });
    doc.roundedRect(x, 220, 168, 170, 10).fill(i % 2 === 0 ? C.white : C.tealSoft);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(String(i + 1).padStart(2, "0"), x + 16, 240);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(p[0], x + 16, 270, { width: 136 });
    body(doc, p[1], x + 16, 300, { width: 136, size: 11 });
  });

  footer(doc, page, total);
}

function drawHowItWorks(doc, page, total) {
  slideBg(doc);
  eyebrow(doc, `0${page}  ·  How it works`);
  title(doc, "From signup to full access.");

  const steps = [
    "Sign up on House In Hands",
    "Choose profile: landlord, tenant, student or estate manager (multi-profile supported)",
    "Complete KYC — NIN + selfie; CAC for estate managers; student ID where required",
    "Use the services you need — marketplace, management, payments, maintenance and more",
  ];

  steps.forEach((s, i) => {
    const y = 130 + i * 78;
    doc.circle(68, y + 18, 22).fill(C.teal);
    doc
      .fillColor(C.white)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(String(i + 1), 60, y + 11, { width: 16, align: "center" });
    if (i < steps.length - 1) {
      doc
        .moveTo(68, y + 42)
        .lineTo(68, y + 78)
        .strokeColor(C.tealSoft)
        .lineWidth(3)
        .stroke();
    }
    card(doc, 110, y, 800, 56);
    body(doc, s, 130, y + 18, { width: 760, size: 13, color: C.ink });
  });

  footer(doc, page, total);
}

function drawProduct(doc, page, total) {
  slideBg(doc);
  eyebrow(doc, `0${page}  ·  Product`);
  title(doc, "Nine services. One lifecycle.");

  body(
    doc,
    "Every service can stand alone. A landlord can manage already-occupied homes without listing a new house. Users only adopt what they need.",
    48,
    105,
    { width: 860, size: 12 }
  );

  const services = [
    "Property marketplace",
    "Property management",
    "Tenant & occupancy",
    "Rent & payments",
    "Maintenance & services",
    "Property-as-a-Service",
    "Data & intelligence",
    "Developer & investor tools",
    "Digital property records",
  ];

  services.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 48 + col * 300;
    const y = 160 + row * 95;
    card(doc, x, y, 284, 80);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(String(i + 1).padStart(2, "0"), x + 18, y + 22);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(s, x + 54, y + 30, { width: 210 });
  });

  footer(doc, page, total);
}

function drawWhyUs(doc, page, total) {
  slideBg(doc);
  eyebrow(doc, `0${page}  ·  Why House In Hands`);
  title(doc, "Control without the chaos.");

  const items = [
    {
      t: "Trust first",
      d: "KYC, verified listings and clearer counterparties before money moves.",
    },
    {
      t: "End-to-end journey",
      d: "Discover → apply → agree → pay → manage → maintain → exit — in one system.",
    },
    {
      t: "Modular by design",
      d: "Use only what you need. Occupied portfolios and marketplace can live side by side.",
    },
    {
      t: "Built for Nigeria",
      d: "Free registration, free listings, local payments, multilingual AI assistance and real market realities.",
    },
  ];

  items.forEach((it, i) => {
    const y = 125 + i * 85;
    doc.rect(48, y, 6, 64).fill(C.teal);
    card(doc, 54, y, 858, 64, { border: false, fill: C.white });
    doc.roundedRect(54, y, 858, 64, 8).fill(C.white);
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(it.t, 74, y + 14);
    body(doc, it.d, 74, y + 36, { width: 820, size: 11 });
  });

  footer(doc, page, total);
}

function drawMissionVision(doc, page, total) {
  slideBg(doc);
  eyebrow(doc, `0${page}  ·  Mission & vision`);
  title(doc, "Where we’re going.");

  card(doc, 48, 130, 420, 280);
  doc
    .fillColor(C.teal)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("OUR MISSION", 72, 160, { characterSpacing: 1.5 });
  body(
    doc,
    "To make housing transactions and property management simpler, more transparent and more accessible by connecting people, properties, payments, services and data.",
    72,
    200,
    { width: 370, size: 14, color: C.ink, lineGap: 6 }
  );

  card(doc, 492, 130, 420, 280, { fill: C.teal, border: false });
  doc.roundedRect(492, 130, 420, 280, 10).fill(C.teal);
  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("OUR VISION", 516, 160, { characterSpacing: 1.5 });
  doc
    .fillColor(C.white)
    .font("Helvetica")
    .fontSize(14)
    .text(
      "To become Africa’s most trusted and intelligent property technology ecosystem.",
      516,
      200,
      { width: 370, lineGap: 6 }
    );

  footer(doc, page, total);
}

function drawValues(doc, page, total) {
  slideBg(doc);
  eyebrow(doc, `0${page}  ·  Core values`);
  title(doc, "Principles that shape the product.");

  const values = [
    ["Trust", "Confidence in who is involved, what is offered and how deals are handled."],
    ["Transparency", "Clear prices, terms, processes, records and responsibilities."],
    ["Innovation", "Automate friction, connect fragmented steps, improve experiences."],
    ["Ownership", "More control over property, money, records and decisions."],
    ["People First", "Built for real Nigerian realities — not abstract ‘users to optimise’."],
  ];

  values.forEach((v, i) => {
    const y = 120 + i * 70;
    doc.circle(64, y + 22, 16).fill(C.tealSoft);
    doc
      .fillColor(C.teal)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(String(i + 1), 58, y + 16, { width: 12, align: "center" });
    doc
      .fillColor(C.ink)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(v[0], 96, y + 8);
    body(doc, v[1], 96, y + 30, { width: 800, size: 11 });
  });

  footer(doc, page, total);
}

function drawAsk(doc, page, total) {
  slideBg(doc, { dark: true });
  doc.rect(0, 0, W, H).fill(C.dark);
  doc.rect(0, 0, 10, H).fill(C.tealBright);

  doc
    .fillColor(C.tealBright)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(`0${page}  ·  LET’S BUILD`, 48, 48, { characterSpacing: 1.5 });

  doc
    .fillColor(C.white)
    .font("Helvetica-Bold")
    .fontSize(32)
    .text("Take property into your hands.", 48, 100, { width: 700 });

  body(
    doc,
    "House In Hands is live and expanding across marketplace, management, payments, KYC, AI assistance and digital records — with free registration and free property listings.",
    48,
    170,
    { width: 700, size: 14, color: "#c5d4d8", lineGap: 5 }
  );

  const contacts = [
    ["Web", "www.houseinhands.com"],
    ["Email", "noreply@houseinhands.com"],
    ["Social", "@houseinhands"],
  ];

  contacts.forEach((c, i) => {
    const x = 48 + i * 290;
    doc.roundedRect(x, 280, 270, 100, 10).fill("#143645");
    doc
      .fillColor(C.tealBright)
      .font("Helvetica-Bold")
      .fontSize(11)
      .text(c[0].toUpperCase(), x + 20, 300, { characterSpacing: 1 });
    doc
      .fillColor(C.white)
      .font("Helvetica")
      .fontSize(13)
      .text(c[1], x + 20, 330, { width: 230 });
  });

  doc
    .fillColor("#9bb5b8")
    .font("Helvetica")
    .fontSize(9)
    .text("House In Hands Limited  ·  Housing you can trust", 48, H - 36);

  doc
    .fillColor("#9bb5b8")
    .fontSize(8)
    .text(`${String(page).padStart(2, "0")} / ${String(total).padStart(2, "0")}`, W - 90, H - 36);
}

async function main() {
  const total = 9;
  const doc = new PDFDocument({
    size: [W, H],
    margin: 0,
    info: {
      Title: "House In Hands — Pitch Deck",
      Author: "House In Hands Limited",
      Subject: "Property technology pitch deck",
    },
  });

  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  drawCover(doc, total);

  doc.addPage({ size: [W, H], margin: 0 });
  drawProblem(doc, 2, total);

  doc.addPage({ size: [W, H], margin: 0 });
  drawSolution(doc, 3, total);

  doc.addPage({ size: [W, H], margin: 0 });
  drawHowItWorks(doc, 4, total);

  doc.addPage({ size: [W, H], margin: 0 });
  drawProduct(doc, 5, total);

  doc.addPage({ size: [W, H], margin: 0 });
  drawWhyUs(doc, 6, total);

  doc.addPage({ size: [W, H], margin: 0 });
  drawMissionVision(doc, 7, total);

  doc.addPage({ size: [W, H], margin: 0 });
  drawValues(doc, 8, total);

  doc.addPage({ size: [W, H], margin: 0 });
  drawAsk(doc, 9, total);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
