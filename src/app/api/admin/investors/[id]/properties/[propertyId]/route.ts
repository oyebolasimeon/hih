import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Property } from "@/models/Property";
import { Booking } from "@/models/Booking";
import { uploadImageBuffer } from "@/lib/cloudinary";

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  address: z.string().trim().min(2).optional(),
  status: z.enum(["active", "inactive", "sold"]).optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; propertyId: string }> }
) {
  const { user, response } = await assertAdmin("properties:write");
  if (response || !user) return response!;

  const { id, propertyId } = await context.params;
  const contentType = request.headers.get("content-type") || "";

  let update: Record<string, unknown> = {};

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    if (form.get("name")) update.name = String(form.get("name"));
    if (form.get("address")) update.address = String(form.get("address"));
    if (form.get("status")) update.status = String(form.get("status"));
    if (form.get("purchasePrice") != null) {
      update.purchasePrice = Number(form.get("purchasePrice"));
    }
    if (form.get("currentValue") != null) {
      update.currentValue = Number(form.get("currentValue"));
    }

    const property = await Property.findOne({ _id: propertyId, investorId: id });
    if (!property) {
      return NextResponse.json({ error: "Property not found." }, { status: 404 });
    }

    const imageUrls = [...property.imageUrls];
    for (const file of form.getAll("images")) {
      if (file instanceof File && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploaded = await uploadImageBuffer(buffer);
        imageUrls.push(uploaded.url);
      }
    }
    update.imageUrls = imageUrls;

    Object.assign(property, update);
    await property.save();
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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid property data." }, { status: 400 });
  }

  const property = await Property.findOneAndUpdate(
    { _id: propertyId, investorId: id },
    parsed.data,
    { new: true }
  ).lean();

  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; propertyId: string }> }
) {
  const { user, response } = await assertAdmin("properties:write");
  if (response || !user) return response!;

  const { id, propertyId } = await context.params;
  const property = await Property.findOneAndDelete({
    _id: propertyId,
    investorId: id,
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }
  await Booking.deleteMany({ propertyId, investorId: id });
  return NextResponse.json({ success: true });
}
