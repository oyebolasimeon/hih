import { connectDB } from "@/lib/db";
import { Announcement, type IAnnouncement } from "@/models/Announcement";
import { User } from "@/models/User";
import { Profile } from "@/models/Profile";
import { buildBrandedEmail, emailButton } from "@/lib/email-layout";
import { escapeHtml, htmlToPlainText } from "@/lib/email-templates";
import { sendMail } from "@/lib/smtp";
import type { AnnouncementAudience } from "@/models/Announcement";

export type PublicAnnouncement = {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  imageUrl: string;
  publishedAt: string | null;
};

export function serializeAnnouncement(doc: IAnnouncement | Record<string, unknown>) {
  const d = doc as IAnnouncement;
  return {
    id: String(d._id),
    title: d.title,
    subtitle: d.subtitle || "",
    body: d.body,
    ctaLabel: d.ctaLabel || "",
    ctaUrl: d.ctaUrl || "",
    imageUrl: d.imageUrl || "",
    audience: d.audience,
    showModal: Boolean(d.showModal),
    sendEmail: Boolean(d.sendEmail),
    active: Boolean(d.active),
    publishedAt: d.publishedAt || null,
    expiresAt: d.expiresAt || null,
    emailSentAt: d.emailSentAt || null,
    emailSentCount: d.emailSentCount || 0,
    emailFailedCount: d.emailFailedCount || 0,
    createdAt: d.createdAt || null,
    updatedAt: d.updatedAt || null,
  };
}

export function toPublicAnnouncement(
  doc: IAnnouncement | Record<string, unknown>
): PublicAnnouncement {
  const d = doc as IAnnouncement;
  return {
    id: String(d._id),
    title: d.title,
    subtitle: d.subtitle || "",
    body: d.body,
    ctaLabel: d.ctaLabel || "",
    ctaUrl: d.ctaUrl || "",
    imageUrl: d.imageUrl || "",
    publishedAt: d.publishedAt ? new Date(d.publishedAt).toISOString() : null,
  };
}

export async function getActiveModalAnnouncement(): Promise<PublicAnnouncement | null> {
  await connectDB();
  const now = new Date();
  const doc = await Announcement.findOne({
    active: true,
    showModal: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  })
    .sort({ publishedAt: -1, createdAt: -1 })
    .lean<IAnnouncement | null>();

  if (!doc) return null;
  return toPublicAnnouncement(doc);
}

async function recipientEmails(
  audience: AnnouncementAudience
): Promise<Array<{ email: string; name: string }>> {
  await connectDB();

  if (audience === "all") {
    const users = await User.find({
      emailNotifications: { $ne: false },
      email: { $exists: true, $ne: "" },
    })
      .select("email name")
      .lean();
    return users
      .filter((u) => u.email)
      .map((u) => ({ email: u.email, name: u.name || "" }));
  }

  const typeMap: Record<
    Exclude<AnnouncementAudience, "all">,
    string
  > = {
    landlords: "landlord",
    tenants: "tenant",
    students: "student",
    estate_managers: "estate_manager",
  };
  const profileType = typeMap[audience];
  const profiles = await Profile.find({ type: profileType })
    .select("userId")
    .lean();
  const userIds = [
    ...new Set(profiles.map((p) => String(p.userId)).filter(Boolean)),
  ];
  if (userIds.length === 0) return [];

  const users = await User.find({
    _id: { $in: userIds },
    emailNotifications: { $ne: false },
    email: { $exists: true, $ne: "" },
  })
    .select("email name")
    .lean();

  return users
    .filter((u) => u.email)
    .map((u) => ({ email: u.email, name: u.name || "" }));
}

function announcementEmailBody(input: {
  title: string;
  subtitle?: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  name?: string;
}) {
  const greeting = input.name ? `Hi ${escapeHtml(input.name)},` : "Hi,";
  const paragraphs = escapeHtml(input.body)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px;">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `
<p style="margin:0 0 16px;">${greeting}</p>
${
  input.subtitle
    ? `<p style="margin:0 0 12px;color:#00A6A6;font-weight:600;">${escapeHtml(input.subtitle)}</p>`
    : ""
}
<h1 style="margin:0 0 16px;font-size:22px;color:#0B1F3A;font-weight:700;">${escapeHtml(input.title)}</h1>
${paragraphs}
${
  input.ctaUrl && input.ctaLabel
    ? emailButton(input.ctaUrl, input.ctaLabel)
    : ""
}
<p style="margin:24px 0 0;color:#475569;font-size:13px;">Property. In Your Hands.</p>
`.trim();
}

export async function sendAnnouncementEmails(
  announcementId: string
): Promise<{ sent: number; failed: number }> {
  await connectDB();
  const doc = await Announcement.findById(announcementId);
  if (!doc) return { sent: 0, failed: 0 };

  const recipients = await recipientEmails(doc.audience);
  let sent = 0;
  let failed = 0;

  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const ctaUrl = doc.ctaUrl
    ? doc.ctaUrl.startsWith("http")
      ? doc.ctaUrl
      : `${appUrl}${doc.ctaUrl.startsWith("/") ? doc.ctaUrl : `/${doc.ctaUrl}`}`
    : "";

  // Send in small batches to avoid overwhelming SMTP
  const BATCH = 8;
  for (let i = 0; i < recipients.length; i += BATCH) {
    const chunk = recipients.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      chunk.map(async (r) => {
        const inner = announcementEmailBody({
          title: doc.title,
          subtitle: doc.subtitle || undefined,
          body: doc.body,
          ctaLabel: doc.ctaLabel || undefined,
          ctaUrl: ctaUrl || undefined,
          name: r.name,
        });
        const html = await buildBrandedEmail(inner, {
          name: r.name,
          email: r.email,
        });
        await sendMail({
          to: r.email,
          subject: doc.title,
          html,
          text: htmlToPlainText(html),
        });
      })
    );
    for (const r of results) {
      if (r.status === "fulfilled") sent += 1;
      else failed += 1;
    }
  }

  doc.emailSentAt = new Date();
  doc.emailSentCount = sent;
  doc.emailFailedCount = failed;
  await doc.save();

  return { sent, failed };
}
