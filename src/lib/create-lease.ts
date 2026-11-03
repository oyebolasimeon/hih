import type { Types } from "mongoose";
import { Lease, type LeasePaymentPeriod, type LeaseSource } from "@/models/Lease";
import type { IListing } from "@/models/Listing";
import { computeAgreementFee, getPlatformFees } from "@/lib/platform-fees";

export async function buildLeaseFromListing(input: {
  listing: IListing;
  tenantProfileId: Types.ObjectId | string;
  landlordProfileId: Types.ObjectId | string;
  applicationId?: Types.ObjectId | string | null;
  source: LeaseSource;
  startDate: Date;
  endDate?: Date | null;
  rentAmount?: number;
  paymentPeriod?: LeasePaymentPeriod;
  currency?: string;
  status?: "draft" | "pending_signature";
  notesLine?: string;
}) {
  const listing = input.listing;
  const fees = await getPlatformFees();
  const legalProvider = listing.legalSettings?.provider || "hih";
  const agreementFeePercent =
    legalProvider === "hih"
      ? fees.agreementFeePercent
      : listing.legalSettings?.agreementFeePercent ?? fees.agreementFeePercent;
  const rentAmount = input.rentAmount ?? listing.price.amount;
  const paymentPeriod = input.paymentPeriod ?? listing.price.period;
  const currency = input.currency || listing.price.currency || "NGN";
  const agreementFeeAmount = computeAgreementFee(
    rentAmount,
    fees.agreementFeePercent,
    agreementFeePercent
  );

  const startDate = input.startDate;
  const endDate =
    input.endDate === undefined
      ? defaultEndDate(startDate, paymentPeriod)
      : input.endDate;

  const termsText = [
    `Tenancy agreement for ${listing.title}`,
    `Address: ${listing.address.street}, ${listing.address.city}, ${listing.address.state}`,
    `Rent: ${currency} ${rentAmount.toLocaleString()} per ${paymentPeriod}`,
    `Start: ${startDate.toISOString().slice(0, 10)}`,
    endDate ? `End: ${endDate.toISOString().slice(0, 10)}` : "",
    "",
    legalProvider === "hih"
      ? "Legal handling: House In Hands will prepare and manage the tenancy documents."
      : `Legal handling: ${listing.legalSettings?.companyName || "Landlord-appointed legal firm"}.`,
    `Agreement fee (${agreementFeePercent}%): ${currency} ${agreementFeeAmount.toLocaleString()} — payable by tenant before signing (when applicable).`,
    input.notesLine || "",
    "",
    "Both parties agree to the House In Hands platform terms and applicable Nigerian tenancy laws.",
    "Signatures below confirm acceptance of these terms.",
  ]
    .filter(Boolean)
    .join("\n");

  return Lease.create({
    listingId: listing._id,
    tenantProfileId: input.tenantProfileId,
    landlordProfileId: input.landlordProfileId,
    applicationId: input.applicationId || undefined,
    source: input.source,
    status: input.status || "pending_signature",
    startDate,
    endDate: endDate || undefined,
    rentAmount,
    currency,
    paymentPeriod,
    termsText,
    legalProvider,
    legalCompanyName: listing.legalSettings?.companyName,
    agreementFeePercent,
    agreementFeeAmount,
  });
}

function defaultEndDate(start: Date, period: LeasePaymentPeriod) {
  const end = new Date(start);
  if (period === "yearly") end.setFullYear(end.getFullYear() + 1);
  else if (period === "term") end.setMonth(end.getMonth() + 4);
  else end.setMonth(end.getMonth() + 12);
  return end;
}
