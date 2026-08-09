import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import {
  DEFAULT_INVESTOR_MODAL,
  getInvestorLoginModalContent,
  upsertInvestorLoginModalContent,
} from "@/lib/site-content";
import { deleteImage, uploadImageBuffer } from "@/lib/cloudinary";
import {
  actorFromUser,
  diffObjects,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

export async function GET() {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  const content = await getInvestorLoginModalContent();
  return NextResponse.json({ content, defaults: DEFAULT_INVESTOR_MODAL });
}

const updateSchema = z.object({
  title: z.string().min(2).max(120).optional(),
  body: z.string().min(20).max(8000).optional(),
  ctaLabel: z.string().min(2).max(60).optional(),
  clearImage: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid content payload." }, { status: 400 });
  }

  const current = await getInvestorLoginModalContent();
  let imageUrl = current.imageUrl;
  let imagePublicId = current.imagePublicId;

  if (parsed.data.clearImage) {
    if (imagePublicId) {
      try {
        await deleteImage(imagePublicId);
      } catch {
        // Ignore Cloudinary cleanup failures
      }
    }
    imageUrl = "";
    imagePublicId = "";
  }

  const content = await upsertInvestorLoginModalContent(
    {
      title: parsed.data.title,
      body: parsed.data.body,
      ctaLabel: parsed.data.ctaLabel,
      ...(parsed.data.clearImage ? { imageUrl, imagePublicId } : {}),
    },
    user.id
  );

  await writeAudit({
    action: "site_content.update",
    summary: "Updated investor login modal content",
    actor: actorFromUser(user),
    entityType: "SiteContent",
    entityId: "investor-login-modal",
    investorVisible: false,
    changes: diffObjects(
      {
        title: current.title,
        body: current.body,
        ctaLabel: current.ctaLabel,
        imageUrl: current.imageUrl,
      },
      {
        title: content.title,
        body: content.body,
        ctaLabel: content.ctaLabel,
        imageUrl: content.imageUrl,
      },
      ["title", "body", "ctaLabel", "imageUrl"]
    ),
    request,
  });

  return NextResponse.json({ content });
}

export async function POST(request: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required." }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }

  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 8MB." }, { status: 400 });
  }

  const current = await getInvestorLoginModalContent();
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadImageBuffer(buffer, "nova-elite/site");

  if (current.imagePublicId) {
    try {
      await deleteImage(current.imagePublicId);
    } catch {
      // Ignore
    }
  }

  const content = await upsertInvestorLoginModalContent(
    {
      imageUrl: uploaded.url,
      imagePublicId: uploaded.publicId,
    },
    user.id
  );

  await writeAudit({
    action: "site_content.image_upload",
    summary: "Uploaded investor login modal image",
    actor: actorFromUser(user),
    entityType: "SiteContent",
    entityId: "investor-login-modal",
    investorVisible: false,
    changes: [
      {
        field: "imageUrl",
        oldValue: sanitizeAuditValue(current.imageUrl || null),
        newValue: sanitizeAuditValue(content.imageUrl),
      },
    ],
    request,
  });

  return NextResponse.json({ content });
}
