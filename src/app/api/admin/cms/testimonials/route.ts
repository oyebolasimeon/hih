import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Testimonial } from "@/models/Testimonial";
import {
  actorFromUser,
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

export async function GET() {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  const testimonials = await Testimonial.find()
    .sort({ order: 1, createdAt: -1 })
    .lean();
  return NextResponse.json({ testimonials: testimonials.map(serialize) });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  quote: z.string().trim().min(1).max(2000),
  photoUrl: z.string().trim().url().optional().or(z.literal("")),
  rating: z.number().int().min(1).max(5).optional(),
  order: z.number().int().min(0).max(9999).optional(),
  published: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid testimonial payload." },
      { status: 400 }
    );
  }

  const doc = await Testimonial.create({
    name: parsed.data.name,
    role: parsed.data.role,
    quote: parsed.data.quote,
    photoUrl: parsed.data.photoUrl || undefined,
    rating: parsed.data.rating ?? 5,
    order: parsed.data.order ?? 0,
    published: Boolean(parsed.data.published),
  });

  await writeAudit({
    action: "cms.testimonial.create",
    summary: `Created testimonial from ${doc.name}`,
    actor: actorFromUser(user),
    entityType: "Testimonial",
    entityId: String(doc._id),
    investorVisible: false,
    changes: [
      {
        field: "testimonial",
        oldValue: null,
        newValue: sanitizeAuditValue({
          name: doc.name,
          role: doc.role,
          published: doc.published,
        }),
      },
    ],
    request,
  });

  return NextResponse.json({ testimonial: serialize(doc) });
}
