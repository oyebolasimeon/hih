import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import { uploadImageBuffer } from "@/lib/cloudinary";

export async function POST(request: Request) {
  const { response } = await assertAdmin("content:write");
  if (response) return response;

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
  return NextResponse.json({ url: uploaded.url, publicId: uploaded.publicId });
}
