/** Fixed acknowledgment text shown/accepted when a tenant accepts a landlord invite. */
export const TENANT_INVITE_LEGAL_VERSION = "hih-tenant-invite-v1";

export function tenantInviteLegalText(input: {
  landlordName: string;
  landlordEmail: string;
  propertyTitle: string;
  propertyAddress: string;
}) {
  return [
    `I confirm that I know or have verified that ${input.landlordName} (${input.landlordEmail}) is the landlord / authorised manager inviting me for “${input.propertyTitle}” at ${input.propertyAddress}.`,
    "I understand that accepting this invitation will add me as the tenant on this property in House In Hands, create a digital tenancy record (application + lease draft), and allow rent, documents and maintenance to be managed on the platform.",
    "I am not being asked to pay anyone outside the platform based only on this email. I will review the lease terms carefully before signing, and I can decline if anything looks wrong.",
    `Acknowledgement version: ${TENANT_INVITE_LEGAL_VERSION}.`,
  ].join(" ");
}
