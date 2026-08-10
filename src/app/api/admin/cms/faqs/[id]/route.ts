import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { FaqItem } from "@/models/FaqItem";
import {
  actorFromUser,
  diffObjects,
  leanDoc,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

function serialize(doc: {
  _id: unknown;
  question: string;
  answer: string;
  category?: string;
  order: number;
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: String(doc._id),
    question: doc.question,
    answer: doc.answer,
    category: doc.category || "",
    order: doc.order,
    published: doc.published,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const updateSchema = z.object({
  question: z.string().trim().min(2).max(400).optional(),
  answer: z.string().trim().min(1).max(10000).optional(),
  category: z.string().trim().max(80).optional(),
  order: z.number().int().min(0).max(9999).optional(),
  published: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  const doc = await FaqItem.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "FAQ not found." }, { status: 404 });
  }

  const before = leanDoc(doc.toObject() as Record<string, unknown>);
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  if (parsed.data.question !== undefined) doc.question = parsed.data.question;
  if (parsed.data.answer !== undefined) doc.answer = parsed.data.answer;
  if (parsed.data.category !== undefined) {
    doc.category = parsed.data.category || undefined;
  }
  if (parsed.data.order !== undefined) doc.order = parsed.data.order;
  if (parsed.data.published !== undefined) doc.published = parsed.data.published;

  await doc.save();

  await writeAudit({
    action: "cms.faq.update",
    summary: `Updated FAQ: ${doc.question}`,
    actor: actorFromUser(user),
    entityType: "FaqItem",
    entityId: String(doc._id),
    investorVisible: false,
    changes: diffObjects(
      before,
      leanDoc(doc.toObject() as Record<string, unknown>),
      ["question", "answer", "category", "order", "published"]
    ),
    request,
  });

  return NextResponse.json({ faq: serialize(doc) });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  const doc = await FaqItem.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "FAQ not found." }, { status: 404 });
  }

  await doc.deleteOne();

  await writeAudit({
    action: "cms.faq.delete",
    summary: `Deleted FAQ: ${doc.question}`,
    actor: actorFromUser(user),
    entityType: "FaqItem",
    entityId: String(doc._id),
    investorVisible: false,
    changes: [
      {
        field: "faq",
        oldValue: sanitizeAuditValue({
          question: doc.question,
          published: doc.published,
        }),
        newValue: null,
      },
    ],
    request,
  });

  return NextResponse.json({ ok: true });
}
