import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { uploadImageBuffer } from "@/lib/cloudinary";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  const caption = String(form.get("caption") || "").trim().slice(0, 240);
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File must be 8MB or smaller." },
      { status: 400 }
    );
  }
  if (file.type && !ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, or WebP photos are allowed as proof." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const uploaded = await uploadImageBuffer(
      buffer,
      "house-in-hand/building-issues",
      "image"
    );
    return NextResponse.json({
      url: uploaded.url,
      publicId: uploaded.publicId,
      kind: "photo",
      caption: caption || undefined,
      filename: file.name,
    });
  } catch (err) {
    console.error("Building issue upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Check Cloudinary configuration." },
      { status: 502 }
    );
  }
}
