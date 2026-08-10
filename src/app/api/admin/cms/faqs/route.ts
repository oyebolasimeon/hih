import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { FaqItem } from "@/models/FaqItem";
import {
  actorFromUser,
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

export async function GET() {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  const faqs = await FaqItem.find().sort({ order: 1, createdAt: -1 }).lean();
  return NextResponse.json({ faqs: faqs.map(serialize) });
}

const createSchema = z.object({
  question: z.string().trim().min(2).max(400),
  answer: z.string().trim().min(1).max(10000),
  category: z.string().trim().max(80).optional(),
  order: z.number().int().min(0).max(9999).optional(),
  published: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid FAQ payload." }, { status: 400 });
  }

  const doc = await FaqItem.create({
    question: parsed.data.question,
    answer: parsed.data.answer,
    category: parsed.data.category || undefined,
    order: parsed.data.order ?? 0,
    published: Boolean(parsed.data.published),
  });

  await writeAudit({
    action: "cms.faq.create",
    summary: `Created FAQ: ${doc.question}`,
    actor: actorFromUser(user),
    entityType: "FaqItem",
    entityId: String(doc._id),
    investorVisible: false,
    changes: [
      {
        field: "faq",
        oldValue: null,
        newValue: sanitizeAuditValue({
          question: doc.question,
          published: doc.published,
          order: doc.order,
        }),
      },
    ],
    request,
  });

  return NextResponse.json({ faq: serialize(doc) });
}
