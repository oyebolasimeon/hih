import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import { uploadImageBuffer } from "@/lib/cloudinary";
import { writeAudit, actorFromUser } from "@/lib/audit";

export async function POST(request: Request) {
  const { user, response } = await assertAdmin("content:write");
  if (response || !user) return response!;

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Image required." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 8MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploaded = await uploadImageBuffer(buffer, "nova-elite/email");

  await writeAudit({
    action: "email_template.asset_upload",
    summary: "Uploaded email template image",
    actor: actorFromUser(user),
    entityType: "CloudinaryAsset",
    entityId: uploaded.publicId,
    investorVisible: false,
    changes: [
      {
        field: "imageUrl",
        oldValue: null,
        newValue: uploaded.url,
      },
    ],
    request,
  });

  return NextResponse.json({ url: uploaded.url, publicId: uploaded.publicId });
}
