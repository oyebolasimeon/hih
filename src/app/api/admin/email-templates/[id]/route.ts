import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { EmailTemplate } from "@/models/EmailTemplate";
import { EMAIL_ACTIONS, type EmailAction } from "@/lib/email-templates";
import { resolveEmailTemplate } from "@/lib/email-send";
import { sendMail } from "@/lib/smtp";
import {
  actorFromUser,
  diffObjects,
  leanDoc,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

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

  const before = leanDoc(doc.toObject() as Record<string, unknown>);

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
    if (doc.isDefault) {
      const otherDefault = await EmailTemplate.findOne({
        _id: { $ne: doc._id },
        isDefault: true,
      });
      if (!otherDefault) {
        return NextResponse.json(
          {
            error:
              "Cannot remove fallback status. Mark another template as fallback first, or edit this one instead.",
          },
          { status: 400 }
        );
      }
    }
    doc.isDefault = false;
  }

  if (parsed.data.active === false && doc.isDefault) {
    return NextResponse.json(
      {
        error:
          "Cannot deactivate the fallback template. Mark another template as fallback first.",
      },
      { status: 400 }
    );
  }

  if (parsed.data.name !== undefined) doc.name = parsed.data.name;
  if (parsed.data.subject !== undefined) doc.subject = parsed.data.subject;
  if (parsed.data.html !== undefined) doc.html = parsed.data.html;
  if (parsed.data.active !== undefined) doc.active = parsed.data.active;
  doc.updatedBy = user.id as unknown as typeof doc.updatedBy;

  await doc.save();

  await writeAudit({
    action: "email_template.update",
    summary: `Updated email template ${doc.name}`,
    actor: actorFromUser(user),
    entityType: "EmailTemplate",
    entityId: String(doc._id),
    investorVisible: false,
    changes: diffObjects(
      before,
      leanDoc(doc.toObject() as Record<string, unknown>),
      ["name", "subject", "html", "isDefault", "actions", "active"]
    ),
    request,
  });

  return NextResponse.json({ template: serialize(doc) });
}

export async function DELETE(
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

  if (doc.isDefault) {
    return NextResponse.json(
      {
        error:
          "Cannot delete the fallback template. Mark another template as fallback first.",
      },
      { status: 400 }
    );
  }

  await doc.deleteOne();

  await writeAudit({
    action: "email_template.delete",
    summary: `Deleted email template ${doc.name}`,
    actor: actorFromUser(user),
    entityType: "EmailTemplate",
    entityId: String(doc._id),
    investorVisible: false,
    changes: [
      {
        field: "template",
        oldValue: sanitizeAuditValue({
          name: doc.name,
          subject: doc.subject,
          isDefault: doc.isDefault,
          actions: doc.actions,
          active: doc.active,
        }),
        newValue: null,
      },
    ],
    request,
  });

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
  const { emailBaseVars, resolveBrandedEmailHtml } = await import(
    "@/lib/email-layout"
  );
  const appUrl = (process.env.AUTH_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
  const vars = emailBaseVars({
    name: user.name || "Investor",
    email: user.email,
    resetUrl: `${appUrl}/reset-password?token=preview-token`,
    verifyUrl: `${appUrl}/verify-email?token=preview-token`,
    role: "admin",
  });

  const subject = renderTemplateString(doc.subject, vars);
  const innerHtml = renderTemplateString(doc.html, vars);
  const html = resolveBrandedEmailHtml(innerHtml, vars);
  const text = htmlToPlainText(html);

  if (parsed.data.send) {
    const to = parsed.data.to || user.email;
    await sendMail({ to, subject: `[Preview] ${subject}`, html, text });
    await writeAudit({
      action: "email_template.test_send",
      summary: `Sent test email for template ${doc.name} to ${to}`,
      actor: actorFromUser(user),
      entityType: "EmailTemplate",
      entityId: String(doc._id),
      investorVisible: false,
      metadata: { to, action, subject },
      request,
    });
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
