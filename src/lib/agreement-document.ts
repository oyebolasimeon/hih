import { randomBytes } from "crypto";
import { generateAgreementPdf } from "@/lib/receipt-pdf";
import { sendAgreementDocumentEmail } from "@/lib/receipt-email";
import { Lease } from "@/models/Lease";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { Profile } from "@/models/Profile";

export async function finalizeSignedAgreement(lease: InstanceType<typeof Lease>) {
  const listing = await Listing.findById(lease.listingId).select("title").lean();
  const documentNumber =
    lease.documentNumber || `AGR-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;

  const pdf = await generateAgreementPdf({
    title: listing?.title || "Tenancy agreement",
    documentNumber,
    termsText: lease.termsText || "",
    rentAmount: lease.rentAmount,
    currency: lease.currency,
    paymentPeriod: lease.paymentPeriod,
    startDate: lease.startDate,
    endDate: lease.endDate,
    legalProvider: lease.legalProvider,
    legalCompanyName: lease.legalCompanyName,
    tenantSignatureName: lease.tenantSignatureName,
    landlordSignatureName: lease.landlordSignatureName,
    tenantSignedAt: lease.tenantSignedAt,
    landlordSignedAt: lease.landlordSignedAt,
  });

  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");
  lease.documentNumber = documentNumber;
  lease.documentUrl = `${appUrl}/api/portal/agreements/${lease._id}/document`;
  await lease.save();

  const [tenantProfile, landlordProfile] = await Promise.all([
    Profile.findById(lease.tenantProfileId).select("userId displayName").lean(),
    Profile.findById(lease.landlordProfileId).select("userId displayName").lean(),
  ]);
  const userIds = [tenantProfile?.userId, landlordProfile?.userId].filter(Boolean);
  const users = await User.find({ _id: { $in: userIds } }).select("email name").lean();

  for (const user of users) {
    if (!user.email) continue;
    await sendAgreementDocumentEmail({
      to: user.email,
      subject: `Signed tenancy agreement · ${listing?.title || "House In Hand"}`,
      bodyHtml: `
        <h1 style="margin:0 0 8px;font-size:20px;color:#0B1F3A;">Signed tenancy agreement</h1>
        <p style="margin:0 0 16px;color:#5A6A7D;">The agreement for <strong>${listing?.title || "your property"}</strong> is now active.</p>
        <p style="margin:0 0 8px;color:#5A6A7D;">Document: <strong>${documentNumber}</strong></p>
        <p style="margin:16px 0 0;">
          <a href="${lease.documentUrl}" style="display:inline-block;background:#008585;color:#fff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600;">Download signed PDF</a>
        </p>
        <p style="margin:12px 0 0;color:#5A6A7D;font-size:13px;">The signed PDF is attached to this email.</p>
      `,
      pdf,
      filename: `${documentNumber}.pdf`,
    });
  }

  return { documentNumber, documentUrl: lease.documentUrl, pdf };
}
