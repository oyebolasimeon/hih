import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { Property } from "@/models/Property";
import { uploadImageBuffer } from "@/lib/cloudinary";

const createSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(2),
  status: z.enum(["active", "inactive", "sold"]).default("active"),
  purchasePrice: z.number().min(0).default(0),
  currentValue: z.number().min(0).default(0),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin();
  if (response || !user) return response!;

  const { id: investorId } = await context.params;
  const investor = await Investor.findById(investorId);
  if (!investor) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const parsed = createSchema.safeParse({
      name: form.get("name"),
      address: form.get("address"),
      status: form.get("status") || "active",
      purchasePrice: Number(form.get("purchasePrice") || 0),
      currentValue: Number(form.get("currentValue") || 0),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid property data." }, { status: 400 });
    }

    const imageUrls: string[] = [];
    const files = form.getAll("images");
    for (const file of files) {
      if (file instanceof File && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploaded = await uploadImageBuffer(buffer);
        imageUrls.push(uploaded.url);
      }
    }

    const property = await Property.create({
      investorId,
      ...parsed.data,
      imageUrls,
    });

    return NextResponse.json({
      property: {
        id: String(property._id),
        name: property.name,
        address: property.address,
        imageUrls: property.imageUrls,
        status: property.status,
        purchasePrice: property.purchasePrice,
        currentValue: property.currentValue,
      },
    });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid property data." }, { status: 400 });
  }

  const property = await Property.create({
    investorId,
    ...parsed.data,
    imageUrls: body.imageUrls || [],
  });

  return NextResponse.json({
    property: {
      id: String(property._id),
      name: property.name,
      address: property.address,
      imageUrls: property.imageUrls,
      status: property.status,
      purchasePrice: property.purchasePrice,
      currentValue: property.currentValue,
    },
  });
}
