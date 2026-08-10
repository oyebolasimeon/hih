import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Testimonial } from "@/models/Testimonial";
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
  role: string;
  quote: string;
  photoUrl?: string;
  rating: number;
  order: number;
  published: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: String(doc._id),
    name: doc.name,
    role: doc.role,
    quote: doc.quote,
    photoUrl: doc.photoUrl || "",
    rating: doc.rating,
    order: doc.order,
    published: doc.published,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.string().trim().min(1).max(120).optional(),
  quote: z.string().trim().min(1).max(2000).optional(),
  photoUrl: z.string().trim().url().optional().or(z.literal("")),
  rating: z.number().int().min(1).max(5).optional(),
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
  const doc = await Testimonial.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });
  }

  const before = leanDoc(doc.toObject() as Record<string, unknown>);
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  if (parsed.data.name !== undefined) doc.name = parsed.data.name;
  if (parsed.data.role !== undefined) doc.role = parsed.data.role;
  if (parsed.data.quote !== undefined) doc.quote = parsed.data.quote;
  if (parsed.data.photoUrl !== undefined) {
    doc.photoUrl = parsed.data.photoUrl || undefined;
  }
  if (parsed.data.rating !== undefined) doc.rating = parsed.data.rating;
  if (parsed.data.order !== undefined) doc.order = parsed.data.order;
  if (parsed.data.published !== undefined) doc.published = parsed.data.published;

  await doc.save();

  await writeAudit({
    action: "cms.testimonial.update",
    summary: `Updated testimonial from ${doc.name}`,
    actor: actorFromUser(user),
    entityType: "Testimonial",
    entityId: String(doc._id),
    investorVisible: false,
    changes: diffObjects(
      before,
      leanDoc(doc.toObject() as Record<string, unknown>),
      ["name", "role", "quote", "photoUrl", "rating", "order", "published"]
    ),
    request,
  });

  return NextResponse.json({ testimonial: serialize(doc) });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  const doc = await Testimonial.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Testimonial not found." }, { status: 404 });
  }

  await doc.deleteOne();

  await writeAudit({
    action: "cms.testimonial.delete",
    summary: `Deleted testimonial from ${doc.name}`,
    actor: actorFromUser(user),
    entityType: "Testimonial",
    entityId: String(doc._id),
    investorVisible: false,
    changes: [
      {
        field: "testimonial",
        oldValue: sanitizeAuditValue({
          name: doc.name,
          role: doc.role,
          published: doc.published,
        }),
        newValue: null,
      },
    ],
    request,
  });

  return NextResponse.json({ ok: true });
}
