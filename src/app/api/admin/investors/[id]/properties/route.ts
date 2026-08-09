import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { Property } from "@/models/Property";
import { uploadImageBuffer } from "@/lib/cloudinary";
import {
  actorFromUser,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";
import {
  formPropertyPayload,
  investorPropertyCreateSchema,
  serializeProperty,
} from "@/lib/property-fields";

function propertySnapshot(property: {
  name: string;
  nickname?: string;
  address: string;
  propertyType?: string;
  zone?: string;
  tags?: string[];
  imageUrls: string[];
  status: string;
  purchasePrice: number;
  currentValue: number;
  monthlyRent?: number;
}) {
  return sanitizeAuditValue(serializeProperty({ _id: "", ...property }));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("properties:write");
  if (response || !user) return response!;

  const { id: investorId } = await context.params;
  const investor = await Investor.findById(investorId);
  if (!investor) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const parsed = investorPropertyCreateSchema.safeParse(formPropertyPayload(form));
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
      ownerType: "investor",
      investorId,
      acquisitionType: "nova_outright",
      ...parsed.data,
      imageUrls,
    });

    await writeAudit({
      action: "property.assign",
      summary: `Assigned Nova property ${property.name} outright to ${investor.name}`,
      actor: actorFromUser(user),
      entityType: "Property",
      entityId: String(property._id),
      investorId,
      investorVisible: true,
      changes: [
        {
          field: "property",
          oldValue: null,
          newValue: propertySnapshot(property),
        },
      ],
      request,
    });

    return NextResponse.json({ property: serializeProperty(property) });
  }

  const body = await request.json();
  const parsed = investorPropertyCreateSchema.safeParse({
    ...body,
    tags: Array.isArray(body.tags) ? body.tags : [],
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid property data." }, { status: 400 });
  }

  const property = await Property.create({
    ownerType: "investor",
    investorId,
    acquisitionType: "nova_outright",
    ...parsed.data,
    imageUrls: body.imageUrls || [],
  });

  await writeAudit({
    action: "property.assign",
    summary: `Assigned Nova property ${property.name} outright to ${investor.name}`,
    actor: actorFromUser(user),
    entityType: "Property",
    entityId: String(property._id),
    investorId,
    investorVisible: true,
    changes: [
      {
        field: "property",
        oldValue: null,
        newValue: propertySnapshot(property),
      },
    ],
    request,
  });

  return NextResponse.json({ property: serializeProperty(property) });
}
