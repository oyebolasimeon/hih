import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { PageSection } from "@/models/PageSection";
import {
  actorFromUser,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

function serialize(doc: {
  _id: unknown;
  pageKey: string;
  sectionKey: string;
  title?: string;
  data: Record<string, unknown>;
  order: number;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    id: String(doc._id),
    pageKey: doc.pageKey,
    sectionKey: doc.sectionKey,
    title: doc.title || "",
    data: doc.data || {},
    order: doc.order,
    status: doc.status,
    published: doc.status === "published",
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function GET(request: Request) {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  const pageKey =
    new URL(request.url).searchParams.get("pageKey")?.trim() || "home";

  const sections = await PageSection.find({ pageKey })
    .sort({ order: 1, sectionKey: 1 })
    .lean();

  return NextResponse.json({ pageKey, sections: sections.map(serialize) });
}

const upsertSchema = z.object({
  pageKey: z.string().trim().min(1).max(80).optional(),
  sectionKey: z.string().trim().min(1).max(80),
  title: z.string().trim().max(200).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  order: z.number().int().min(0).max(9999).optional(),
  published: z.boolean().optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export async function PUT(request: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const urlPageKey =
    new URL(request.url).searchParams.get("pageKey")?.trim() || undefined;

  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid section payload." }, { status: 400 });
  }

  const pageKey = (parsed.data.pageKey || urlPageKey || "home").toLowerCase();
  const sectionKey = parsed.data.sectionKey.trim();
  const status =
    parsed.data.status ||
    (parsed.data.published === true
      ? "published"
      : parsed.data.published === false
        ? "draft"
        : undefined);

  const existing = await PageSection.findOne({ pageKey, sectionKey });
  const before = existing
    ? {
        title: existing.title,
        data: existing.data,
        order: existing.order,
        status: existing.status,
      }
    : null;

  const doc = await PageSection.findOneAndUpdate(
    { pageKey, sectionKey },
    {
      $set: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.data !== undefined ? { data: parsed.data.data } : {}),
        ...(parsed.data.order !== undefined ? { order: parsed.data.order } : {}),
        ...(status !== undefined ? { status } : {}),
      },
      $setOnInsert: {
        pageKey,
        sectionKey,
        ...(parsed.data.title === undefined ? { title: "" } : {}),
        ...(parsed.data.data === undefined ? { data: {} } : {}),
        ...(parsed.data.order === undefined ? { order: 0 } : {}),
        ...(status === undefined ? { status: "draft" } : {}),
      },
    },
    { upsert: true, new: true }
  );

  await writeAudit({
    action: existing ? "cms.section.update" : "cms.section.create",
    summary: `${existing ? "Updated" : "Created"} section ${pageKey}/${sectionKey}`,
    actor: actorFromUser(user),
    entityType: "PageSection",
    entityId: String(doc!._id),
    investorVisible: false,
    changes: [
      {
        field: "section",
        oldValue: sanitizeAuditValue(before),
        newValue: sanitizeAuditValue({
          title: doc!.title,
          data: doc!.data,
          order: doc!.order,
          status: doc!.status,
        }),
      },
    ],
    request,
  });

  return NextResponse.json({ section: serialize(doc!) });
}
