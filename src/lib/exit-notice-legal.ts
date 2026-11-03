export const EXIT_NOTICE_LEGAL_VERSION = "hih-exit-notice-v1";
export const EXIT_NOTICE_TENANT_ACK_VERSION = "hih-exit-tenant-ack-v1";

export function buildExitNoticeTerms(input: {
  noticeType: string;
  propertyTitle: string;
  propertyAddress: string;
  landlordName: string;
  tenantName: string;
  proposedVacateDate: Date;
  reason: string;
  leaseStart: Date;
  leaseEnd?: Date | null;
  rentAmount: number;
  currency: string;
  paymentPeriod: string;
  leaseTermsExcerpt: string;
  unpaidRentDetected: boolean;
}) {
  const vacate = input.proposedVacateDate.toLocaleDateString("en-NG");
  const typeLabel =
    input.noticeType === "landlord_quit"
      ? "Landlord notice to quit / vacate"
      : input.noticeType === "tenant_early_exit"
        ? "Tenant early exit request"
        : input.noticeType === "mutual"
          ? "Mutual early termination"
          : "End of tenancy / expiry";

  return [
    `HOUSE IN HANDS — EXIT / VACATE NOTICE`,
    `Legal document version: ${EXIT_NOTICE_LEGAL_VERSION}`,
    ``,
    `Type: ${typeLabel}`,
    `Property: ${input.propertyTitle}`,
    `Address: ${input.propertyAddress}`,
    `Landlord / manager: ${input.landlordName}`,
    `Tenant: ${input.tenantName}`,
    `Lease term: ${input.leaseStart.toLocaleDateString("en-NG")} – ${
      input.leaseEnd
        ? input.leaseEnd.toLocaleDateString("en-NG")
        : "open / to confirm"
    }`,
    `Rent: ${input.currency} ${input.rentAmount.toLocaleString()} / ${input.paymentPeriod}`,
    `Proposed vacate date: ${vacate}`,
    ``,
    `Grounds / reason:`,
    input.reason.trim(),
    ``,
    `This notice is issued with reference to the signed tenancy agreement on House In Hands. Relevant agreement excerpt:`,
    input.leaseTermsExcerpt.slice(0, 2500) || "(No additional terms on file.)",
    ``,
    input.unpaidRentDetected
      ? "Unpaid or incomplete rent for the current period was detected. Any refund of prepaid/remaining rent (if applicable) will be determined by House In Hands admin and legal review against the agreement before funds move."
      : "Rent status at issue time did not flag unpaid current-period rent. Remaining-period refunds (if any) still require admin/legal confirmation against the agreement.",
    ``,
    `This notice is not served to the tenant until House In Hands AI screening and human legal/ops review approve it. Serving does not replace statutory requirements that may apply under Nigerian tenancy law for your locality.`,
  ].join("\n");
}

export function tenantExitAckText(input: {
  propertyTitle: string;
  proposedVacateDate: Date;
  documentNumber: string;
}) {
  return [
    `I acknowledge receipt of exit notice ${input.documentNumber} for “${input.propertyTitle}”, proposing vacate on ${input.proposedVacateDate.toLocaleDateString("en-NG")}.`,
    "I understand I should follow the vacate date and any instructions in the legal notice, and that rent / refund outcomes (if any) are decided by House In Hands admin and legal against my tenancy agreement.",
    `Acknowledgement version: ${EXIT_NOTICE_TENANT_ACK_VERSION}.`,
  ].join(" ");
}
