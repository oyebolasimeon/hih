import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { Announcement } from "@/models/Announcement";
import {
  serializeAnnouncement,
  sendAnnouncementEmails,
} from "@/lib/announcements";
import {
  actorFromUser,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

const createSchema = z.object({
  title: z.string().trim().min(3).max(200),
  subtitle: z.string().trim().max(300).optional(),
  body: z.string().trim().min(1).max(20000),
  ctaLabel: z.string().trim().max(80).optional(),
  ctaUrl: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().max(1000).optional(),
  audience: z
    .enum(["all", "landlords", "tenants", "students", "estate_managers"])
    .optional(),
  showModal: z.boolean().optional(),
  sendEmail: z.boolean().optional(),
  active: z.boolean().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  /** When true and active, blast emails immediately */
  publishAndEmail: z.boolean().optional(),
});

export async function GET() {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  await connectDB();
  const rows = await Announcement.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  return NextResponse.json({
    announcements: rows.map((r) => serializeAnnouncement(r)),
  });
}

export async function POST(request: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid announcement payload.", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const active = Boolean(data.active || data.publishAndEmail);
  const sendEmail = data.sendEmail !== false;

  await connectDB();

  // Only one active modal at a time keeps the site calm
  if (active && data.showModal !== false) {
    await Announcement.updateMany(
      { active: true, showModal: true },
      { $set: { active: false } }
    );
  }

  const doc = await Announcement.create({
    title: data.title,
    subtitle: data.subtitle || "",
    body: data.body,
    ctaLabel: data.ctaLabel || "",
    ctaUrl: data.ctaUrl || "",
    imageUrl: data.imageUrl || "",
    audience: data.audience || "all",
    showModal: data.showModal !== false,
    sendEmail,
    active,
    publishedAt: active ? new Date() : undefined,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    createdByUserId: new mongoose.Types.ObjectId(user.id),
  });

  let emailResult: { sent: number; failed: number } | null = null;
  if (active && sendEmail && (data.publishAndEmail || data.sendEmail)) {
    emailResult = await sendAnnouncementEmails(String(doc._id));
  }

  await writeAudit({
    action: "cms.announcement.create",
    summary: `Created announcement: ${doc.title}`,
    actor: actorFromUser(user),
    entityType: "Announcement",
    entityId: String(doc._id),
    investorVisible: false,
    changes: [
      {
        field: "announcement",
        oldValue: null,
        newValue: sanitizeAuditValue({
          title: doc.title,
          active: doc.active,
          sendEmail: doc.sendEmail,
          emailResult,
        }),
      },
    ],
    request,
  });

  const fresh = await Announcement.findById(doc._id).lean();
  return NextResponse.json({
    announcement: serializeAnnouncement(fresh || doc),
    emailResult,
  });
}
