import mongoose from "mongoose";
import { formatRentPeriodLabel } from "@/lib/rent-period";
import {
  buildAgreementFeeBreakdown,
  buildRentFeeBreakdown,
  type LegalProvider,
} from "@/lib/platform-fees";
import { Payment } from "@/models/Payment";
import { Profile } from "@/models/Profile";
import { User } from "@/models/User";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import type { ReceiptDocumentInput } from "@/lib/receipt-pdf";

export type FullReceipt = {
  receiptNumber: string | null;
  paymentId: string;
  purpose: string;
  purposeLabel: string;
  amount: number;
  currency: string;
  grossAmount: number;
  platformFeeAmount: number;
  agreementFeeAmount: number;
  netPayeeAmount: number;
  paidAt: string | null;
  providerRef: string | null;
  receiptPdfUrl: string | null;
  rentPeriodLabel: string | null;
  legalProvider: LegalProvider | null;
  legalCompanyName: string | null;
  breakdown: Array<{ label: string; amount: number; kind: string }>;
  payer: { name: string; email?: string | null } | null;
  payee: { name: string; type: string } | null;
  listing: { title: string; address?: string } | null;
  lease: {
    id: string;
    rentAmount: number;
    currency: string;
    paymentPeriod: string;
    tenantSignatureName?: string;
    landlordSignatureName?: string;
    tenantSignedAt?: string | null;
    landlordSignedAt?: string | null;
  } | null;
  signatures: Array<{ role: string; name: string; signedAt?: string | null }>;
};

function purposeLabel(purpose: string) {
  if (purpose === "agreement_fee") return "Agreement & legal fee";
  if (purpose === "wallet_deposit") return "Wallet deposit";
  if (purpose === "rent") return "Rent payment";
  return purpose.replace(/_/g, " ");
}

export async function buildFullPaymentReceipt(
  paymentId: string,
  userId: string
): Promise<FullReceipt | null> {
  const payment = await Payment.findById(paymentId).lean();
  if (!payment || payment.status !== "successful") return null;

  const profiles = await Profile.find({ userId }).select("_id").lean();
  const profileIds = new Set(profiles.map((p) => String(p._id)));
  const isPayer = String(payment.payerUserId) === userId;
  const isPayee =
    payment.payeeProfileId && profileIds.has(String(payment.payeeProfileId));
  const isPlatformPayee =
    payment.platformProfileId && profileIds.has(String(payment.platformProfileId));
  if (!isPayer && !isPayee && !isPlatformPayee) return null;

  const [payerUser, payeeProfile, lease, listing] = await Promise.all([
    User.findById(payment.payerUserId).select("name email").lean(),
    payment.payeeProfileId
      ? Profile.findById(payment.payeeProfileId).select("displayName type").lean()
      : null,
    payment.leaseId
      ? Lease.findById(payment.leaseId).lean()
      : null,
    payment.listingId
      ? Listing.findById(payment.listingId).select("title address").lean()
      : null,
  ]);

  const legalProvider = (lease?.legalProvider ||
    payment.legalProvider ||
    "hih") as LegalProvider;
  const grossAmount = payment.grossAmount ?? payment.amount;
  const platformFeeAmount = payment.platformFeeAmount ?? 0;
  const agreementFeeAmount = payment.agreementFeeAmount ?? 0;
  const netPayeeAmount = payment.netPayeeAmount ?? payment.amount;

  const breakdown =
    payment.purpose === "agreement_fee"
      ? buildAgreementFeeBreakdown({
          rentAmount: lease?.rentAmount || grossAmount,
          agreementFee: agreementFeeAmount || payment.amount,
          platformFee: platformFeeAmount,
          currency: payment.currency,
          legalProvider,
          legalCompanyName: lease?.legalCompanyName || payment.legalCompanyName,
        })
      : buildRentFeeBreakdown({
          grossAmount,
          currency: payment.currency,
          platformFee: platformFeeAmount,
          legalProvider,
        });

  const rentPeriodLabel =
    payment.rentPeriodStart && payment.rentPeriodEnd
      ? formatRentPeriodLabel(
          new Date(payment.rentPeriodStart),
          new Date(payment.rentPeriodEnd)
        )
      : null;

  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );

  const signatures: FullReceipt["signatures"] = [];
  if (lease?.tenantSignatureName) {
    signatures.push({
      role: "Tenant",
      name: lease.tenantSignatureName,
      signedAt: lease.tenantSignedAt
        ? new Date(lease.tenantSignedAt).toISOString()
        : null,
    });
  }
  if (lease?.landlordSignatureName) {
    signatures.push({
      role: "Landlord",
      name: lease.landlordSignatureName,
      signedAt: lease.landlordSignedAt
        ? new Date(lease.landlordSignedAt).toISOString()
        : null,
    });
  }

  return {
    receiptNumber: payment.receiptNumber || null,
    paymentId: String(payment._id),
    purpose: payment.purpose,
    purposeLabel: purposeLabel(payment.purpose),
    amount: payment.amount,
    currency: payment.currency,
    grossAmount,
    platformFeeAmount,
    agreementFeeAmount,
    netPayeeAmount,
    paidAt: payment.paidAt ? new Date(payment.paidAt).toISOString() : null,
    providerRef: payment.providerRef || null,
    receiptPdfUrl:
      payment.receiptPdfUrl ||
      `${appUrl}/api/portal/payments/${payment._id}/receipt/pdf`,
    rentPeriodLabel,
    legalProvider,
    legalCompanyName: lease?.legalCompanyName || payment.legalCompanyName || null,
    breakdown,
    payer: payerUser
      ? { name: payerUser.name || payerUser.email || "Tenant", email: payerUser.email }
      : null,
    payee: payeeProfile
      ? { name: payeeProfile.displayName, type: payeeProfile.type }
      : payment.purpose === "agreement_fee" && legalProvider === "hih"
        ? { name: "House In Hand", type: "platform" }
        : null,
    listing: listing
      ? {
          title: listing.title,
          address: listing.address
            ? `${listing.address.street}, ${listing.address.city}, ${listing.address.state}`
            : undefined,
        }
      : null,
    lease: lease
      ? {
          id: String(lease._id),
          rentAmount: lease.rentAmount,
          currency: lease.currency,
          paymentPeriod: lease.paymentPeriod,
          tenantSignatureName: lease.tenantSignatureName,
          landlordSignatureName: lease.landlordSignatureName,
          tenantSignedAt: lease.tenantSignedAt
            ? new Date(lease.tenantSignedAt).toISOString()
            : null,
          landlordSignedAt: lease.landlordSignedAt
            ? new Date(lease.landlordSignedAt).toISOString()
            : null,
        }
      : null,
    signatures,
  };
}

export function fullReceiptToPdfInput(receipt: FullReceipt): ReceiptDocumentInput {
  return {
    title: receipt.purposeLabel,
    receiptNumber: receipt.receiptNumber || receipt.paymentId,
    issuedAt: receipt.paidAt ? new Date(receipt.paidAt) : new Date(),
    payerName: receipt.payer?.name || "Payer",
    payeeName: receipt.payee?.name || "Payee",
    propertyTitle: receipt.listing?.title,
    propertyAddress: receipt.listing?.address,
    reference: receipt.providerRef || undefined,
    currency: receipt.currency,
    lines: receipt.breakdown.map((line) => ({
      label: line.label,
      amount: line.amount,
      kind: line.kind as ReceiptDocumentInput["lines"][number]["kind"],
    })),
    totalAmount: receipt.amount,
    purposeLabel: receipt.purposeLabel,
    rentPeriodLabel: receipt.rentPeriodLabel || undefined,
    signatures: receipt.signatures.map((sig) => ({
      role: sig.role,
      name: sig.name,
      signedAt: sig.signedAt ? new Date(sig.signedAt) : null,
    })),
  };
}

export async function storeReceiptPdfUrl(
  paymentId: mongoose.Types.ObjectId | string,
  pdfUrl: string
) {
  await Payment.findByIdAndUpdate(paymentId, { receiptPdfUrl: pdfUrl });
}
