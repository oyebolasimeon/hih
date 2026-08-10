import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { BlogPost } from "@/models/BlogPost";
import {
  actorFromUser,
  diffObjects,
  leanDoc,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

function serialize(doc: {
  _id: unknown;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  featuredImageUrl?: string;
  authorName?: string;
  categories?: string[];
  tags?: string[];
  status: string;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: String(doc._id),
    title: doc.title,
    slug: doc.slug,
    excerpt: doc.excerpt,
    body: doc.body,
    featuredImageUrl: doc.featuredImageUrl || "",
    authorName: doc.authorName || "",
    categories: doc.categories || [],
    tags: doc.tags || [],
    status: doc.status,
    published: doc.status === "published",
    publishedAt: doc.publishedAt || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

const updateSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  excerpt: z.string().trim().min(1).max(500).optional(),
  body: z.string().trim().min(1).max(200000).optional(),
  featuredImageUrl: z.string().trim().url().optional().or(z.literal("")),
  authorName: z.string().trim().max(120).optional(),
  published: z.boolean().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  const { id } = await context.params;
  const doc = await BlogPost.findById(id).lean();
  if (!doc) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }
  return NextResponse.json({ post: serialize(doc) });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  const doc = await BlogPost.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const before = leanDoc(doc.toObject() as Record<string, unknown>);
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  if (parsed.data.slug !== undefined) {
    const slug = parsed.data.slug.toLowerCase();
    const clash = await BlogPost.findOne({ slug, _id: { $ne: doc._id } });
    if (clash) {
      return NextResponse.json({ error: "A post with that slug already exists." }, { status: 409 });
    }
    doc.slug = slug;
  }

  if (parsed.data.title !== undefined) doc.title = parsed.data.title;
  if (parsed.data.excerpt !== undefined) doc.excerpt = parsed.data.excerpt;
  if (parsed.data.body !== undefined) doc.body = parsed.data.body;
  if (parsed.data.featuredImageUrl !== undefined) {
    doc.featuredImageUrl = parsed.data.featuredImageUrl || undefined;
  }
  if (parsed.data.authorName !== undefined) {
    doc.authorName = parsed.data.authorName || undefined;
  }

  if (parsed.data.published !== undefined) {
    if (parsed.data.published) {
      doc.status = "published";
      if (!doc.publishedAt) doc.publishedAt = new Date();
    } else {
      doc.status = "draft";
    }
  }

  await doc.save();

  await writeAudit({
    action: "cms.blog.update",
    summary: `Updated blog post ${doc.title}`,
    actor: actorFromUser(user),
    entityType: "BlogPost",
    entityId: String(doc._id),
    investorVisible: false,
    changes: diffObjects(
      before,
      leanDoc(doc.toObject() as Record<string, unknown>),
      ["title", "slug", "excerpt", "body", "featuredImageUrl", "authorName", "status", "publishedAt"]
    ),
    request,
  });

  return NextResponse.json({ post: serialize(doc) });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  const doc = await BlogPost.findById(id);
  if (!doc) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  await doc.deleteOne();

  await writeAudit({
    action: "cms.blog.delete",
    summary: `Deleted blog post ${doc.title}`,
    actor: actorFromUser(user),
    entityType: "BlogPost",
    entityId: String(doc._id),
    investorVisible: false,
    changes: [
      {
        field: "post",
        oldValue: sanitizeAuditValue({
          title: doc.title,
          slug: doc.slug,
          status: doc.status,
        }),
        newValue: null,
      },
    ],
    request,
  });

  return NextResponse.json({ ok: true });
}
