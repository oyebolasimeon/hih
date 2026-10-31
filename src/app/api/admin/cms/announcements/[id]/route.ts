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

const patchSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  subtitle: z.string().trim().max(300).optional(),
  body: z.string().trim().min(1).max(20000).optional(),
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
  /** Re-send / first-time email blast */
  sendEmailNow: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  await connectDB();
  const doc = await Announcement.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const data = parsed.data;
  if (data.title !== undefined) doc.title = data.title;
  if (data.subtitle !== undefined) doc.subtitle = data.subtitle;
  if (data.body !== undefined) doc.body = data.body;
  if (data.ctaLabel !== undefined) doc.ctaLabel = data.ctaLabel;
  if (data.ctaUrl !== undefined) doc.ctaUrl = data.ctaUrl;
  if (data.imageUrl !== undefined) doc.imageUrl = data.imageUrl;
  if (data.audience !== undefined) doc.audience = data.audience;
  if (data.showModal !== undefined) doc.showModal = data.showModal;
  if (data.sendEmail !== undefined) doc.sendEmail = data.sendEmail;
  if (data.expiresAt !== undefined) {
    doc.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  }

  if (data.active !== undefined) {
    if (data.active && doc.showModal) {
      await Announcement.updateMany(
        { _id: { $ne: doc._id }, active: true, showModal: true },
        { $set: { active: false } }
      );
    }
    doc.active = data.active;
    if (data.active && !doc.publishedAt) doc.publishedAt = new Date();
  }

  await doc.save();

  let emailResult: { sent: number; failed: number } | null = null;
  if (data.sendEmailNow) {
    emailResult = await sendAnnouncementEmails(String(doc._id));
  }

  await writeAudit({
    action: "cms.announcement.update",
    summary: `Updated announcement: ${doc.title}`,
    actor: actorFromUser(user),
    entityType: "Announcement",
    entityId: String(doc._id),
    investorVisible: false,
    changes: [
      {
        field: "announcement",
        oldValue: null,
        newValue: sanitizeAuditValue({
          active: doc.active,
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await connectDB();
  const doc = await Announcement.findByIdAndDelete(id);
  if (!doc) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await writeAudit({
    action: "cms.announcement.delete",
    summary: `Deleted announcement: ${doc.title}`,
    actor: actorFromUser(user),
    entityType: "Announcement",
    entityId: String(doc._id),
    investorVisible: false,
    request: _request,
  });

  return NextResponse.json({ ok: true });
}
