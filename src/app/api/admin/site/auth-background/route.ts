import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import {
  DEFAULT_AUTH_BACKGROUND,
  getAuthBackgroundContent,
  upsertAuthBackgroundContent,
} from "@/lib/site-content";
import { deleteImage, uploadImageBuffer } from "@/lib/cloudinary";
import {
  actorFromUser,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

export async function GET() {
  const { response } = await assertAdmin("content:read");
  if (response) return response;

  const content = await getAuthBackgroundContent();
  return NextResponse.json({
    content,
    defaults: DEFAULT_AUTH_BACKGROUND,
  });
}

export async function PATCH(request: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const body = await request.json().catch(() => ({}));
  if (!body?.clearImage) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const current = await getAuthBackgroundContent();
  if (current.imagePublicId) {
    try {
      await deleteImage(current.imagePublicId);
    } catch {
      // Ignore Cloudinary cleanup failures
    }
  }

  const content = await upsertAuthBackgroundContent(
    { imageUrl: "", imagePublicId: "" },
    user.id
  );

  await writeAudit({
    action: "site_content.auth_background_clear",
    summary: "Reset auth page background to default",
    actor: actorFromUser(user),
    entityType: "SiteContent",
    entityId: "auth-background",
    investorVisible: false,
    changes: [
      {
        field: "imageUrl",
        oldValue: sanitizeAuditValue(current.imageUrl),
        newValue: sanitizeAuditValue(content.imageUrl),
      },
    ],
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
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 10MB." }, { status: 400 });
  }

  const current = await getAuthBackgroundContent();
  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadImageBuffer(buffer, "nova-elite/site");

  if (current.imagePublicId) {
    try {
      await deleteImage(current.imagePublicId);
    } catch {
      // Ignore
    }
  }

  const content = await upsertAuthBackgroundContent(
    {
      imageUrl: uploaded.url,
      imagePublicId: uploaded.publicId,
    },
    user.id
  );

  await writeAudit({
    action: "site_content.auth_background_upload",
    summary: "Updated auth page background image",
    actor: actorFromUser(user),
    entityType: "SiteContent",
    entityId: "auth-background",
    investorVisible: false,
    changes: [
      {
        field: "imageUrl",
        oldValue: sanitizeAuditValue(current.imageUrl),
        newValue: sanitizeAuditValue(content.imageUrl),
      },
    ],
    request,
  });

  return NextResponse.json({ content });
}
