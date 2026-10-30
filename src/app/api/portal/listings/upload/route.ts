import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { uploadImageBuffer } from "@/lib/cloudinary";
import {
  requireActiveProfile,
  requireVerifiedProfile,
} from "@/lib/profile-context";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
]);

function detectMediaType(file: File): "image" | "video" | null {
  if (IMAGE_TYPES.has(file.type) || file.type.startsWith("image/")) {
    return "image";
  }
  if (VIDEO_TYPES.has(file.type) || file.type.startsWith("video/")) {
    return "video";
  }
  const name = file.name.toLowerCase();
  if (/\.(jpe?g|png|webp)$/.test(name)) return "image";
  if (/\.(mp4|webm|mov|m4v)$/.test(name)) return "video";
  return null;
}

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, [
    "landlord",
    "estate_manager",
  ]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const verified = await requireVerifiedProfile(active.profile);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error },
      { status: verified.status }
    );
  }

  await connectDB();

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Expected multipart form data." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }

  const mediaType = detectMediaType(file);
  if (!mediaType) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP images or MP4/WebM/MOV videos are allowed." },
      { status: 400 }
    );
  }

  const maxBytes = mediaType === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return NextResponse.json(
      {
        error:
          mediaType === "video"
            ? "Video must be 80MB or smaller."
            : "Image must be 8MB or smaller.",
      },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const uploaded = await uploadImageBuffer(
      buffer,
      mediaType === "video"
        ? "house-in-hand/listings/videos"
        : "house-in-hand/listings",
      mediaType
    );
    return NextResponse.json({
      url: uploaded.url,
      publicId: uploaded.publicId,
      filename: file.name,
      mediaType,
    });
  } catch (err) {
    console.error("Listing upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Check Cloudinary configuration." },
      { status: 502 }
    );
  }
}
