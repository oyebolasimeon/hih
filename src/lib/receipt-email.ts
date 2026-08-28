import {
  buildFullPaymentReceipt,
  fullReceiptToPdfInput,
} from "@/lib/receipt-document";
import { generateReceiptPdf } from "@/lib/receipt-pdf";
import { buildBrandedEmail } from "@/lib/email-layout";
import { sendMail } from "@/lib/smtp";
import { Payment } from "@/models/Payment";

function receiptEmailHtml(receipt: Awaited<ReturnType<typeof buildFullPaymentReceipt>>) {
  if (!receipt) return "";
  const rows = receipt.breakdown
    .map(
      (line) =>
        `<tr><td style="padding:8px 0;color:#5A6A7D;">${line.label}</td><td style="padding:8px 0;text-align:right;font-weight:600;color:#0B1F3A;">${receipt.currency} ${line.amount.toLocaleString()}</td></tr>`
    )
    .join("");

  return `
    <h1 style="margin:0 0 8px;font-size:20px;color:#0B1F3A;">${receipt.purposeLabel}</h1>
    <p style="margin:0 0 16px;color:#5A6A7D;">Receipt <strong>${receipt.receiptNumber || receipt.paymentId}</strong></p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;border-top:1px solid #E0D4C2;border-bottom:1px solid #E0D4C2;">
      ${rows}
    </table>
    ${
      receipt.rentPeriodLabel
        ? `<p style="margin:0 0 8px;color:#5A6A7D;">Rent period: ${receipt.rentPeriodLabel}</p>`
        : ""
    }
    <p style="margin:16px 0 0;">
      <a href="${receipt.receiptPdfUrl}" style="display:inline-block;background:#008585;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600;">Download PDF receipt</a>
    </p>
    <p style="margin:12px 0 0;color:#5A6A7D;font-size:13px;">Your PDF receipt is also attached to this email.</p>
  `;
}

export async function sendPaymentReceiptEmail(paymentId: string, userId: string) {
  const receipt = await buildFullPaymentReceipt(paymentId, userId);
  if (!receipt?.payer?.email) return;

  const pdf = await generateReceiptPdf(fullReceiptToPdfInput(receipt));
  const filename = `${receipt.receiptNumber || receipt.paymentId}.pdf`;
  const html = buildBrandedEmail(receiptEmailHtml(receipt));

  await sendMail({
    to: receipt.payer.email,
    subject: `${receipt.purposeLabel} receipt · ${receipt.receiptNumber || receipt.paymentId}`,
    html,
    attachments: [
      {
        filename,
        content: pdf,
        contentType: "application/pdf",
      },
    ],
  });

  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  await Payment.findByIdAndUpdate(paymentId, {
    receiptPdfUrl: `${appUrl}/api/portal/payments/${paymentId}/receipt/pdf`,
  });
}

export async function sendAgreementDocumentEmail(input: {
  to: string;
  subject: string;
  bodyHtml: string;
  pdf: Buffer;
  filename: string;
}) {
  const html = buildBrandedEmail(input.bodyHtml);
  await sendMail({
    to: input.to,
    subject: input.subject,
    html,
    attachments: [
      {
        filename: input.filename,
        content: input.pdf,
        contentType: "application/pdf",
      },
    ],
  });
}
