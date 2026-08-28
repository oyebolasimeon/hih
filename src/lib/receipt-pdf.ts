import PDFDocument from "pdfkit";

export type ReceiptLine = {
  label: string;
  amount: number;
  kind?: "charge" | "deduction" | "subtotal" | "total";
};

export type ReceiptPropertyDetails = {
  listingType?: string;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqm?: number;
  amenities?: string[];
  rentAmount?: number;
  rentPeriod?: string;
};

export type ReceiptDocumentInput = {
  title: string;
  receiptNumber: string;
  issuedAt: Date;
  payerName: string;
  payeeName: string;
  propertyTitle?: string;
  propertyAddress?: string;
  propertyDetails?: ReceiptPropertyDetails;
  legalHandler?: string;
  legalProvider?: "hih" | "own_legal";
  reference?: string;
  currency: string;
  lines: ReceiptLine[];
  totalAmount: number;
  purposeLabel: string;
  rentPeriodLabel?: string;
  signatures?: Array<{
    role: string;
    name: string;
    signedAt?: Date | null;
  }>;
  footerNote?: string;
};

const PAGE = { left: 48, right: 48, width: 499 };
const COLORS = {
  navy: "#0B1F3A",
  teal: "#008585",
  cream: "#FAF6EF",
  sand: "#E0D4C2",
  muted: "#5A6A7D",
  white: "#FFFFFF",
  tealLight: "#E6F4F4",
};

function formatMoney(amount: number, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatDate(value: Date) {
  return value.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatListingType(type?: string) {
  if (!type) return null;
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number) {
  if (y + needed <= doc.page.height - 64) return y;
  doc.addPage();
  return 48;
}

function drawSectionTitle(doc: PDFKit.PDFDocument, title: string, y: number) {
  doc
    .fillColor(COLORS.teal)
    .fontSize(8)
    .text(title.toUpperCase(), PAGE.left, y, { characterSpacing: 0.8 });
  return y + 16;
}

function drawRoundedBox(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  stroke: string
) {
  doc.roundedRect(x, y, w, h, 8).fillAndStroke(fill, stroke);
}

export async function generateReceiptPdf(
  input: ReceiptDocumentInput
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc.rect(0, 0, doc.page.width, 96).fill(COLORS.navy);
    doc.rect(0, 96, doc.page.width, 4).fill(COLORS.teal);
    doc.fillColor("#F4E9D8").fontSize(24).text("House In Hand", PAGE.left, 32);
    doc
      .fontSize(10)
      .fillColor("#CFE7E7")
      .text("Official payment receipt", PAGE.left, 62);

    doc
      .fillColor(COLORS.white)
      .fontSize(9)
      .text(input.receiptNumber, PAGE.left, 32, {
        width: PAGE.width,
        align: "right",
      });
    doc
      .fontSize(8)
      .fillColor("#CFE7E7")
      .text(`Issued ${formatDate(input.issuedAt)}`, PAGE.left, 46, {
        width: PAGE.width,
        align: "right",
      });

    let y = 118;
    doc.fillColor(COLORS.navy).fontSize(20).text(input.title, PAGE.left, y);
    y += 30;
    doc
      .fillColor(COLORS.muted)
      .fontSize(10)
      .text(input.purposeLabel, PAGE.left, y);
    y += 22;

    // Property block
    if (input.propertyTitle) {
      y = ensureSpace(doc, y, 120);
      const details = input.propertyDetails;
      const specParts: string[] = [];
      const typeLabel = formatListingType(details?.listingType);
      if (typeLabel) specParts.push(typeLabel);
      if (details?.bedrooms != null) specParts.push(`${details.bedrooms} bed`);
      if (details?.bathrooms != null) specParts.push(`${details.bathrooms} bath`);
      if (details?.sizeSqm != null) specParts.push(`${details.sizeSqm} sqm`);

      let boxHeight = 78;
      const amenities = details?.amenities?.filter(Boolean) || [];
      if (specParts.length) boxHeight += 16;
      if (amenities.length) boxHeight += 18 + Math.ceil(amenities.length / 3) * 14;
      if (details?.rentAmount) boxHeight += 16;

      y = ensureSpace(doc, y, boxHeight + 8);
      drawRoundedBox(doc, PAGE.left, y, PAGE.width, boxHeight, COLORS.cream, COLORS.sand);

      let innerY = y + 14;
      innerY = drawSectionTitle(doc, "Property", innerY);
      doc.fillColor(COLORS.navy).fontSize(14).text(input.propertyTitle, PAGE.left + 16, innerY, {
        width: PAGE.width - 32,
      });
      innerY += 20;

      if (input.propertyAddress) {
        doc
          .fillColor(COLORS.muted)
          .fontSize(10)
          .text(input.propertyAddress, PAGE.left + 16, innerY, {
            width: PAGE.width - 32,
          });
        innerY += 16;
      }

      if (specParts.length) {
        doc
          .fillColor(COLORS.teal)
          .fontSize(9)
          .text(specParts.join("  ·  "), PAGE.left + 16, innerY, {
            width: PAGE.width - 32,
          });
        innerY += 16;
      }

      if (details?.rentAmount) {
        doc
          .fillColor(COLORS.muted)
          .fontSize(9)
          .text(
            `Listed rent: ${formatMoney(details.rentAmount, input.currency)}${
              details.rentPeriod ? ` / ${details.rentPeriod}` : ""
            }`,
            PAGE.left + 16,
            innerY
          );
        innerY += 16;
      }

      if (amenities.length) {
        innerY = drawSectionTitle(doc, "What's in the house", innerY - 4);
        const cols = 3;
        const colWidth = (PAGE.width - 32) / cols;
        amenities.forEach((item, index) => {
          const col = index % cols;
          const row = Math.floor(index / cols);
          doc
            .fillColor(COLORS.navy)
            .fontSize(9)
            .text(`• ${item}`, PAGE.left + 16 + col * colWidth, innerY + row * 14, {
              width: colWidth - 8,
            });
        });
        innerY += Math.ceil(amenities.length / cols) * 14;
      }

      y += boxHeight + 16;
    }

    // Parties row
    y = ensureSpace(doc, y, 72);
    const halfW = (PAGE.width - 12) / 2;
    drawRoundedBox(doc, PAGE.left, y, halfW, 58, COLORS.white, COLORS.sand);
    drawRoundedBox(doc, PAGE.left + halfW + 12, y, halfW, 58, COLORS.white, COLORS.sand);

    doc.fillColor(COLORS.muted).fontSize(8).text("PAYER", PAGE.left + 14, y + 12);
    doc
      .fillColor(COLORS.navy)
      .fontSize(11)
      .text(input.payerName, PAGE.left + 14, y + 26, { width: halfW - 28 });

    doc
      .fillColor(COLORS.muted)
      .fontSize(8)
      .text("PAYEE", PAGE.left + halfW + 26, y + 12);
    doc
      .fillColor(COLORS.navy)
      .fontSize(11)
      .text(input.payeeName, PAGE.left + halfW + 26, y + 26, {
        width: halfW - 28,
      });

    y += 72;

    // Legal handler
    if (input.legalHandler) {
      y = ensureSpace(doc, y, 52);
      drawRoundedBox(doc, PAGE.left, y, PAGE.width, 44, COLORS.tealLight, COLORS.teal);
      doc
        .fillColor(COLORS.teal)
        .fontSize(8)
        .text("LEGAL HANDLER", PAGE.left + 14, y + 10);
      doc
        .fillColor(COLORS.navy)
        .fontSize(11)
        .text(input.legalHandler, PAGE.left + 14, y + 24, { width: PAGE.width - 28 });
      y += 56;
    }

    // Breakdown table
    y = ensureSpace(doc, y, 80);
    y = drawSectionTitle(doc, "Cost breakdown", y);
    drawRoundedBox(doc, PAGE.left, y, PAGE.width, 28, COLORS.navy, COLORS.navy);
    doc.fillColor(COLORS.white).fontSize(9).text("Item", PAGE.left + 14, y + 9);
    doc.text("Amount", PAGE.left, y + 9, {
      width: PAGE.width - 14,
      align: "right",
    });
    y += 28;

    for (const line of input.lines) {
      y = ensureSpace(doc, y, 22);
      const isTotal = line.kind === "total";
      const rowH = isTotal ? 26 : 22;
      if (isTotal) {
        drawRoundedBox(doc, PAGE.left, y, PAGE.width, rowH, COLORS.cream, COLORS.sand);
      } else {
        doc
          .rect(PAGE.left, y, PAGE.width, rowH)
          .fill(COLORS.white)
          .strokeColor(COLORS.sand)
          .stroke();
      }
      doc
        .fillColor(isTotal ? COLORS.navy : COLORS.muted)
        .fontSize(isTotal ? 10 : 9)
        .text(line.label, PAGE.left + 14, y + (isTotal ? 8 : 6), { width: 320 });
      doc
        .fillColor(isTotal ? COLORS.teal : COLORS.navy)
        .fontSize(isTotal ? 11 : 9)
        .text(formatMoney(line.amount, input.currency), PAGE.left, y + (isTotal ? 7 : 6), {
          width: PAGE.width - 14,
          align: "right",
        });
      y += rowH;
    }

    y += 14;
    if (input.rentPeriodLabel) {
      y = ensureSpace(doc, y, 16);
      doc.fillColor(COLORS.muted).fontSize(9).text(`Rent period: ${input.rentPeriodLabel}`, PAGE.left, y);
      y += 14;
    }
    if (input.reference) {
      y = ensureSpace(doc, y, 16);
      doc.fillColor(COLORS.muted).fontSize(8).text(`Reference: ${input.reference}`, PAGE.left, y, {
        width: PAGE.width,
      });
      y += 14;
    }

    // Signatures
    if (input.signatures?.length) {
      y = ensureSpace(doc, y, 100);
      y += 8;
      y = drawSectionTitle(doc, "Agreement signatures", y);
      const sigW = (PAGE.width - 12) / 2;
      input.signatures.slice(0, 2).forEach((sig, index) => {
        const x = PAGE.left + index * (sigW + 12);
        drawRoundedBox(doc, x, y, sigW, 64, COLORS.white, COLORS.sand);
        doc.fillColor(COLORS.muted).fontSize(8).text(sig.role.toUpperCase(), x + 12, y + 10);
        doc.fillColor(COLORS.navy).fontSize(11).text(sig.name || "—", x + 12, y + 26);
        if (sig.signedAt) {
          doc
            .fillColor(COLORS.muted)
            .fontSize(8)
            .text(formatDate(new Date(sig.signedAt)), x + 12, y + 44);
        }
      });
      y += 80;
    }

    doc
      .fillColor(COLORS.muted)
      .fontSize(8)
      .text(
        input.footerNote ||
          "This receipt was generated by House In Hand. Keep it for your records.",
        PAGE.left,
        doc.page.height - 56,
        { width: PAGE.width, align: "center" }
      );

    doc.end();
  });
}

export async function generateAgreementPdf(input: {
  title: string;
  documentNumber: string;
  termsText: string;
  rentAmount: number;
  currency: string;
  paymentPeriod: string;
  startDate: Date;
  endDate?: Date | null;
  legalProvider: "hih" | "own_legal";
  legalCompanyName?: string | null;
  tenantSignatureName?: string;
  landlordSignatureName?: string;
  tenantSignedAt?: Date | null;
  landlordSignedAt?: Date | null;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, 72).fill("#0B1F3A");
    doc.fillColor("#F4E9D8").fontSize(20).text("House In Hand", 48, 24);
    doc.fontSize(10).fillColor("#CFE7E7").text("Tenancy agreement", 48, 50);

    doc.fillColor("#0B1F3A").fontSize(16).text(input.title, 48, 92);
    doc
      .fontSize(10)
      .fillColor("#5A6A7D")
      .text(`Document ${input.documentNumber}`, 48, 114);

    doc
      .fontSize(10)
      .fillColor("#0B1F3A")
      .text(
        `Rent: ${formatMoney(input.rentAmount, input.currency)} / ${input.paymentPeriod}`,
        48,
        136
      )
      .text(
        `Term: ${input.startDate.toLocaleDateString()} – ${
          input.endDate ? new Date(input.endDate).toLocaleDateString() : "—"
        }`,
        48,
        152
      )
      .text(
        input.legalProvider === "hih"
          ? "Legal handling: House In Hand"
          : `Legal handling: ${input.legalCompanyName || "Landlord-appointed firm"}`,
        48,
        168
      );

    doc.fontSize(11).fillColor("#0B1F3A").text(input.termsText, 48, 198, {
      width: doc.page.width - 96,
      lineGap: 4,
    });

    const sigY = doc.page.height - 180;
    doc.fillColor("#0B1F3A").fontSize(12).text("Signatures", 48, sigY);

    const boxes = [
      {
        role: "Tenant",
        name: input.tenantSignatureName,
        signedAt: input.tenantSignedAt,
        x: 48,
      },
      {
        role: "Landlord",
        name: input.landlordSignatureName,
        signedAt: input.landlordSignedAt,
        x: 320,
      },
    ];

    for (const box of boxes) {
      doc.roundedRect(box.x, sigY + 22, 220, 70, 6).strokeColor("#D4C4AE").stroke();
      doc.fillColor("#5A6A7D").fontSize(8).text(box.role.toUpperCase(), box.x + 10, sigY + 32);
      doc.fillColor("#0B1F3A").fontSize(11).text(box.name || "—", box.x + 10, sigY + 46);
      if (box.signedAt) {
        doc
          .fillColor("#5A6A7D")
          .fontSize(8)
          .text(new Date(box.signedAt).toLocaleString(), box.x + 10, sigY + 64);
      }
    }

    doc.end();
  });
}
