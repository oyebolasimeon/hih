import { NextResponse } from "next/server";
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
import {
  formPropertyPayload,
  investorPropertyUpdateSchema,
  serializeProperty,
} from "@/lib/property-fields";

const PROPERTY_FIELDS = [
  "name",
  "nickname",
  "address",
  "propertyType",
  "zone",
  "tags",
  "status",
  "purchasePrice",
  "currentValue",
  "monthlyRent",
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

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const parsed = investorPropertyUpdateSchema.safeParse(formPropertyPayload(form));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid property data." }, { status: 400 });
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

    Object.assign(property, parsed.data, { imageUrls });
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

    return NextResponse.json({ property: serializeProperty(property) });
  }

  const body = await request.json();
  const parsed = investorPropertyUpdateSchema.safeParse({
    ...body,
    tags: body.tags !== undefined ? body.tags : undefined,
  });
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

  return NextResponse.json({ property: serializeProperty(property) });
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
        oldValue: sanitizeAuditValue(serializeProperty(property)),
        newValue: null,
      },
    ],
    request,
  });

  return NextResponse.json({ success: true });
}
