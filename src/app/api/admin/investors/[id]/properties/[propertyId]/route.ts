import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Property } from "@/models/Property";
import { Booking } from "@/models/Booking";
import { uploadImageBuffer } from "@/lib/cloudinary";
import {
  actorFromUser,
  diffObjects,
  leanDoc,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  address: z.string().trim().min(2).optional(),
  status: z.enum(["active", "inactive", "sold"]).optional(),
  purchasePrice: z.number().min(0).optional(),
  currentValue: z.number().min(0).optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

const PROPERTY_FIELDS = [
  "name",
  "address",
  "status",
  "purchasePrice",
  "currentValue",
  "imageUrls",
];

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

    const before = leanDoc(property.toObject() as Record<string, unknown>);

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

    const after = leanDoc(property.toObject() as Record<string, unknown>);
    await writeAudit({
      action: "property.update",
      summary: `Updated property ${property.name}`,
      actor: actorFromUser(user),
      entityType: "Property",
      entityId: String(property._id),
      investorId: id,
      investorVisible: true,
      changes: diffObjects(before, after, PROPERTY_FIELDS),
      request,
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
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid property data." }, { status: 400 });
  }

  const before = await Property.findOne({
    _id: propertyId,
    investorId: id,
  }).lean();
  if (!before) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const property = await Property.findOneAndUpdate(
    { _id: propertyId, investorId: id },
    parsed.data,
    { new: true }
  ).lean();

  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  await writeAudit({
    action: "property.update",
    summary: `Updated property ${property.name}`,
    actor: actorFromUser(user),
    entityType: "Property",
    entityId: String(property._id),
    investorId: id,
    investorVisible: true,
    changes: diffObjects(leanDoc(before), leanDoc(property), PROPERTY_FIELDS),
    request,
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

export async function DELETE(
  request: Request,
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

  await writeAudit({
    action: "property.delete",
    summary: `Deleted property ${property.name}`,
    actor: actorFromUser(user),
    entityType: "Property",
    entityId: String(property._id),
    investorId: id,
    investorVisible: true,
    changes: [
      {
        field: "property",
        oldValue: sanitizeAuditValue({
          name: property.name,
          address: property.address,
          imageUrls: property.imageUrls,
          status: property.status,
          purchasePrice: property.purchasePrice,
          currentValue: property.currentValue,
        }),
        newValue: null,
      },
    ],
    request,
  });

  return NextResponse.json({ success: true });
}
