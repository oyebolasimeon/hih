import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { EmailTemplate } from "@/models/EmailTemplate";
import {
  EMAIL_ACTIONS,
  EMAIL_ACTION_LABELS,
  EMAIL_VARIABLES,
  BUILTIN_TEMPLATES,
  type EmailAction,
} from "@/lib/email-templates";
import {
  actorFromUser,
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

export async function GET() {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  const templates = await EmailTemplate.find().sort({ updatedAt: -1 }).lean();

  const actionMap: Record<string, string | null> = {};
  for (const action of EMAIL_ACTIONS) {
    const match = templates.find(
      (t) => t.active && (t.actions || []).includes(action)
    );
    actionMap[action] = match ? String(match._id) : null;
  }

  const defaultTpl = templates.find((t) => t.active && t.isDefault);

  return NextResponse.json({
    templates: templates.map(serialize),
    actions: EMAIL_ACTIONS.map((key) => ({
      key,
      label: EMAIL_ACTION_LABELS[key],
      templateId: actionMap[key],
    })),
    defaultTemplateId: defaultTpl ? String(defaultTpl._id) : null,
    variables: EMAIL_VARIABLES,
    builtins: BUILTIN_TEMPLATES,
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().min(2).max(200),
  html: z.string().min(10).max(200000),
  isDefault: z.boolean().optional(),
  actions: z.array(z.enum(EMAIL_ACTIONS)).optional(),
  active: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid template payload." }, { status: 400 });
  }

  const actions = (parsed.data.actions || []) as EmailAction[];

  if (actions.length) {
    await EmailTemplate.updateMany(
      { actions: { $in: actions } },
      { $pull: { actions: { $in: actions } } }
    );
  }

  if (parsed.data.isDefault) {
    await EmailTemplate.updateMany({ isDefault: true }, { $set: { isDefault: false } });
  }

  const doc = await EmailTemplate.create({
    name: parsed.data.name,
    subject: parsed.data.subject,
    html: parsed.data.html,
    isDefault: Boolean(parsed.data.isDefault),
    actions,
    active: parsed.data.active !== false,
    updatedBy: user.id,
  });

  await writeAudit({
    action: "email_template.create",
    summary: `Created email template ${doc.name}`,
    actor: actorFromUser(user),
    entityType: "EmailTemplate",
    entityId: String(doc._id),
    investorVisible: false,
    changes: [
      {
        field: "template",
        oldValue: null,
        newValue: sanitizeAuditValue({
          name: doc.name,
          subject: doc.subject,
          isDefault: doc.isDefault,
          actions: doc.actions,
          active: doc.active,
        }),
      },
    ],
    request,
  });

  return NextResponse.json({ template: serialize(doc) });
}
