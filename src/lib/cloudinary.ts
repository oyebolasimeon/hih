import { v2 as cloudinary } from "cloudinary";

export function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
}

export async function uploadImageBuffer(
  buffer: Buffer,
  folder = "nova-elite/properties"
) {
  const client = configureCloudinary();
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Cloudinary upload failed"));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
}

export async function deleteImage(publicId: string) {
  const client = configureCloudinary();
  await client.uploader.destroy(publicId);
}
