import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { EmailTemplate } from "@/models/EmailTemplate";
import { EMAIL_ACTIONS, type EmailAction } from "@/lib/email-templates";
import { resolveEmailTemplate } from "@/lib/email-send";
import { sendMail } from "@/lib/smtp";

function serialize(doc: {
  _id: unknown;
  name: string;
  subject: string;
  html: string;
  isDefault: boolean;
  actions: string[];
  active: boolean;
  updatedAt?: Date;
  createdAt?: Date;
}) {
  return {
    id: String(doc._id),
    name: doc.name,
    subject: doc.subject,
    html: doc.html,
    isDefault: doc.isDefault,
    actions: doc.actions as EmailAction[],
    active: doc.active,
    updatedAt: doc.updatedAt,
    createdAt: doc.createdAt,
  };
}

const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  subject: z.string().trim().min(2).max(200).optional(),
  html: z.string().min(10).max(200000).optional(),
  isDefault: z.boolean().optional(),
  actions: z.array(z.enum(EMAIL_ACTIONS)).optional(),
  active: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  const { id } = await context.params;
  const doc = await EmailTemplate.findById(id).lean();
  if (!doc) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  return NextResponse.json({ template: serialize(doc) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  const doc = await EmailTemplate.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  if (parsed.data.actions) {
    const actions = parsed.data.actions as EmailAction[];
    await EmailTemplate.updateMany(
      { _id: { $ne: doc._id }, actions: { $in: actions } },
      { $pull: { actions: { $in: actions } } }
    );
    doc.actions = actions;
  }

  if (parsed.data.isDefault === true) {
    await EmailTemplate.updateMany(
      { _id: { $ne: doc._id }, isDefault: true },
      { $set: { isDefault: false } }
    );
    doc.isDefault = true;
  } else if (parsed.data.isDefault === false) {
    doc.isDefault = false;
  }

  if (parsed.data.name !== undefined) doc.name = parsed.data.name;
  if (parsed.data.subject !== undefined) doc.subject = parsed.data.subject;
  if (parsed.data.html !== undefined) doc.html = parsed.data.html;
  if (parsed.data.active !== undefined) doc.active = parsed.data.active;
  doc.updatedBy = user.id as unknown as typeof doc.updatedBy;

  await doc.save();
  return NextResponse.json({ template: serialize(doc) });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await assertAdmin("content:write");
  if (response) return response;

  const { id } = await context.params;
  const doc = await EmailTemplate.findByIdAndDelete(id);
  if (!doc) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

const previewSchema = z.object({
  action: z.enum(EMAIL_ACTIONS).optional(),
  to: z.string().email().optional(),
  send: z.boolean().optional(),
});

/** Preview resolved output; optionally send a test email. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  const doc = await EmailTemplate.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Template not found." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid preview request." }, { status: 400 });
  }

  const action =
    parsed.data.action ||
    (doc.actions[0] as EmailAction | undefined) ||
    "welcome";

  // Temporarily ensure this template wins for preview by resolving then
  // overriding with this doc content if needed — simpler: render via resolve
  // path after ensuring binding, or render directly:
  const { renderTemplateString, htmlToPlainText } = await import(
    "@/lib/email-templates"
  );
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const vars = {
    name: user.name || "Investor",
    email: user.email,
    appUrl,
    loginUrl: `${appUrl}/login`,
    portalUrl: `${appUrl}/portal`,
    adminUrl: `${appUrl}/admin`,
    resetUrl: `${appUrl}/reset-password?token=preview-token`,
    role: "admin",
    year: new Date().getFullYear(),
  };

  const subject = renderTemplateString(doc.subject, vars);
  const html = renderTemplateString(doc.html, vars);
  const text = htmlToPlainText(html);

  if (parsed.data.send) {
    const to = parsed.data.to || user.email;
    await sendMail({ to, subject: `[Preview] ${subject}`, html, text });
    return NextResponse.json({ ok: true, sentTo: to, subject, html, action });
  }

  // Also return what system would resolve for the action today
  const resolved = await resolveEmailTemplate(action, vars);

  return NextResponse.json({
    subject,
    html,
    text,
    action,
    systemResolved: resolved,
  });
}
