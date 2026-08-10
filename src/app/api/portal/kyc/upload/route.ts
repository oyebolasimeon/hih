import { NextResponse } from "next/server";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { uploadImageBuffer } from "@/lib/cloudinary";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Expected multipart form data." }, { status: 400 });
  }

  const kind = String(form.get("kind") || "selfie").trim();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File must be 5MB or smaller." }, { status: 400 });
  }
  if (file.type && !ALLOWED.has(file.type) && !file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, WebP, or PDF uploads are allowed." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const folder =
    kind === "student_id"
      ? "house-in-hand/kyc/student-id"
      : kind === "proof_of_address"
        ? "house-in-hand/kyc/address"
        : "house-in-hand/kyc/selfie";
  const resourceType =
    file.type === "application/pdf" ? "raw" : ("image" as const);

  try {
    const uploaded = await uploadImageBuffer(buffer, folder, resourceType);
    return NextResponse.json({
      kind,
      url: uploaded.url,
      publicId: uploaded.publicId,
      filename: file.name,
    });
  } catch (err) {
    console.error("KYC upload failed:", err);
    return NextResponse.json(
      { error: "Upload failed. Check Cloudinary configuration." },
      { status: 502 }
    );
  }
}
