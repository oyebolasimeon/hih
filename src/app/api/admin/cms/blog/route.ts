import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { BlogPost } from "@/models/BlogPost";
import {
  actorFromUser,
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

export async function GET() {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  const posts = await BlogPost.find().sort({ updatedAt: -1 }).lean();
  return NextResponse.json({ posts: posts.map(serialize) });
}

const createSchema = z.object({
  title: z.string().trim().min(2).max(200),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  excerpt: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(200000),
  featuredImageUrl: z.string().trim().url().optional().or(z.literal("")),
  authorName: z.string().trim().max(120).optional(),
  published: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid blog post payload." }, { status: 400 });
  }

  const slug = parsed.data.slug.toLowerCase();
  const existing = await BlogPost.findOne({ slug });
  if (existing) {
    return NextResponse.json({ error: "A post with that slug already exists." }, { status: 409 });
  }

  const published = Boolean(parsed.data.published);
  const doc = await BlogPost.create({
    title: parsed.data.title,
    slug,
    excerpt: parsed.data.excerpt,
    body: parsed.data.body,
    featuredImageUrl: parsed.data.featuredImageUrl || undefined,
    authorName: parsed.data.authorName || undefined,
    status: published ? "published" : "draft",
    publishedAt: published ? new Date() : undefined,
  });

  await writeAudit({
    action: "cms.blog.create",
    summary: `Created blog post ${doc.title}`,
    actor: actorFromUser(user),
    entityType: "BlogPost",
    entityId: String(doc._id),
    investorVisible: false,
    changes: [
      {
        field: "post",
        oldValue: null,
        newValue: sanitizeAuditValue({
          title: doc.title,
          slug: doc.slug,
          status: doc.status,
        }),
      },
    ],
    request,
  });

  return NextResponse.json({ post: serialize(doc) });
}
