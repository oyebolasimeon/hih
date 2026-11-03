import { buildBrandedEmail, emailButton } from "@/lib/email-layout";
import { htmlToPlainText } from "@/lib/email-templates";
import { sendMail } from "@/lib/smtp";
import { getSiteUrl } from "@/lib/seo/site";

export async function sendTenantInviteEmail(input: {
  to: string;
  tenantName: string;
  landlordName: string;
  propertyTitle: string;
  propertyAddress: string;
  rentLabel: string;
  token: string;
  expiresAt: Date;
}) {
  const appUrl = getSiteUrl();
  const inviteUrl = `${appUrl}/portal/invites/${encodeURIComponent(input.token)}`;
  const inner = `
<p style="margin:0 0 16px;">Hi ${escape(input.tenantName)},</p>
<p style="margin:0 0 16px;">
  <strong>${escape(input.landlordName)}</strong> invited you to manage your tenancy for
  <strong>${escape(input.propertyTitle)}</strong> on House In Hands.
</p>
<p style="margin:0 0 8px;color:#5A6A7D;font-size:14px;">
  ${escape(input.propertyAddress)}<br/>
  Rent: ${escape(input.rentLabel)}
</p>
<p style="margin:0 0 16px;">
  Accepting lets you and your landlord share digital lease signing, rent payments,
  documents and maintenance in one place.
</p>
${emailButton(inviteUrl, "Accept invitation")}
<p style="margin:16px 0 0;font-size:13px;color:#5A6A7D;">
  This link expires on ${input.expiresAt.toLocaleDateString("en-NG", {
    dateStyle: "medium",
  })}.
  If you weren’t expecting this, you can ignore the email.
</p>
`.trim();

  const html = await buildBrandedEmail(inner, {
    name: input.tenantName,
    email: input.to,
  });

  await sendMail({
    to: input.to,
    subject: `You're invited to manage your tenancy — ${input.propertyTitle}`,
    html,
    text: htmlToPlainText(html),
  });
}

function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
