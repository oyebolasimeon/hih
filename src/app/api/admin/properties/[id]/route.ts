import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Property } from "@/models/Property";
import { uploadImageBuffer } from "@/lib/cloudinary";
import {
  actorFromUser,
  diffObjects,
  leanDoc,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";
import {
  investmentFieldsSchema,
  parseInvestmentFromForm,
  PROPERTY_INVESTMENT_FIELDS,
  serializeInvestmentFields,
} from "@/lib/property-investment-fields";

const updateSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    address: z.string().trim().min(2).optional(),
    status: z.enum(["active", "pending", "inactive", "sold"]).optional(),
    purchasePrice: z.number().min(0).optional(),
    currentValue: z.number().min(0).optional(),
    notes: z.string().trim().max(2000).optional(),
  })
  .merge(investmentFieldsSchema.partial());

const PROPERTY_FIELDS = [
  "name",
  "address",
  "status",
  "purchasePrice",
  "currentValue",
  "notes",
  "imageUrls",
  ...PROPERTY_INVESTMENT_FIELDS,
];

function serialize(property: InstanceType<typeof Property>) {
  return {
    id: String(property._id),
    ownerType: "company" as const,
    investorId: null,
    investorName: "Nova Elite Homes",
    investorEmail: "",
    name: property.name,
    address: property.address,
    imageUrls: property.imageUrls,
    status: property.status,
    purchasePrice: property.purchasePrice,
    currentValue: property.currentValue,
    notes: property.notes || "",
    ...serializeInvestmentFields(property),
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("properties:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  const property = await Property.findOne({ _id: id, ownerType: "company" });
  if (!property) {
    return NextResponse.json(
      { error: "Company property not found." },
      { status: 404 }
    );
  }

  const before = leanDoc(property.toObject() as Record<string, unknown>);
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const parsed = updateSchema.safeParse({
      name: form.get("name") || undefined,
      address: form.get("address") || undefined,
      status: form.get("status") || undefined,
      purchasePrice:
        form.get("purchasePrice") != null && form.get("purchasePrice") !== ""
          ? Number(form.get("purchasePrice"))
          : undefined,
      currentValue:
        form.get("currentValue") != null && form.get("currentValue") !== ""
          ? Number(form.get("currentValue"))
          : undefined,
      notes: form.get("notes") != null ? String(form.get("notes")) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid update." }, { status: 400 });
    }

    Object.assign(property, parsed.data);

    const investParsed = parseInvestmentFromForm(form);
    if (!investParsed.success) {
      return NextResponse.json(
        { error: "Invalid investment listing data." },
        { status: 400 }
      );
    }
    Object.assign(property, investParsed.data);

    const files = form.getAll("images");
    const uploaded: string[] = [];
    for (const file of files) {
      if (file instanceof File && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await uploadImageBuffer(buffer, "nova-elite/company");
        uploaded.push(result.url);
      }
    }

    if (form.get("replaceImages") === "true" && uploaded.length) {
      property.imageUrls = uploaded;
    } else if (uploaded.length) {
      property.imageUrls = [...property.imageUrls, ...uploaded];
    }

    await property.save();

    await writeAudit({
      action: "company_property.update",
      summary: `Updated company property ${property.name}`,
      actor: actorFromUser(user),
      entityType: "Property",
      entityId: String(property._id),
      investorVisible: false,
      changes: diffObjects(
        before,
        leanDoc(property.toObject() as Record<string, unknown>),
        PROPERTY_FIELDS
      ),
      request,
    });

    return NextResponse.json({ property: serialize(property) });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update." }, { status: 400 });
  }

  Object.assign(property, parsed.data);
  if (Array.isArray(body.imageUrls)) {
    property.imageUrls = body.imageUrls;
  }
  await property.save();

  await writeAudit({
    action: "company_property.update",
    summary: `Updated company property ${property.name}`,
    actor: actorFromUser(user),
    entityType: "Property",
    entityId: String(property._id),
    investorVisible: false,
    changes: diffObjects(
      before,
      leanDoc(property.toObject() as Record<string, unknown>),
      PROPERTY_FIELDS
    ),
    request,
  });

  return NextResponse.json({ property: serialize(property) });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("properties:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  const property = await Property.findOneAndDelete({
    _id: id,
    ownerType: "company",
  });

  if (!property) {
    return NextResponse.json(
      { error: "Company property not found." },
      { status: 404 }
    );
  }

  await writeAudit({
    action: "company_property.delete",
    summary: `Deleted company property ${property.name}`,
    actor: actorFromUser(user),
    entityType: "Property",
    entityId: String(property._id),
    investorVisible: false,
    changes: [
      {
        field: "property",
        oldValue: sanitizeAuditValue({
          name: property.name,
          address: property.address,
          status: property.status,
          purchasePrice: property.purchasePrice,
          currentValue: property.currentValue,
          notes: property.notes || "",
          imageUrls: property.imageUrls,
          ...serializeInvestmentFields(property),
        }),
        newValue: null,
      },
    ],
    request,
  });

  return NextResponse.json({ success: true });
}
