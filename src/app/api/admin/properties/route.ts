import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Property } from "@/models/Property";
import { Investor } from "@/models/Investor";
import { uploadImageBuffer } from "@/lib/cloudinary";
import {
  actorFromUser,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

function serializeProperty(
  p: {
    _id: unknown;
    ownerType?: string;
    investorId?: unknown;
    name: string;
    address: string;
    imageUrls: string[];
    status: string;
    purchasePrice: number;
    currentValue: number;
    notes?: string;
    updatedAt?: Date;
  },
  investor?: { name: string; email: string } | null
) {
  const ownerType = p.ownerType === "company" ? "company" : "investor";
  return {
    id: String(p._id),
    ownerType,
    investorId: p.investorId ? String(p.investorId) : null,
    investorName:
      ownerType === "company"
        ? "Nova Elite Homes"
        : investor?.name || "Unknown",
    investorEmail: ownerType === "company" ? "" : investor?.email || "",
    name: p.name,
    address: p.address,
    imageUrls: p.imageUrls || [],
    status: p.status,
    purchasePrice: p.purchasePrice,
    currentValue: p.currentValue,
    notes: p.notes || "",
    updatedAt: p.updatedAt,
  };
}

export async function GET(request: Request) {
  const { user, response } = await assertAdmin("properties:read");
  if (response || !user) return response!;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const investorId = searchParams.get("investorId") || "";
  const status = searchParams.get("status") || "";
  const owner = searchParams.get("owner") || "all"; // all | company | investor

  const filter: Record<string, unknown> = {};
  if (owner === "company") filter.ownerType = "company";
  if (owner === "investor") {
    filter.$or = [
      { ownerType: "investor" },
      { ownerType: { $exists: false } },
      { ownerType: null },
    ];
  }
  if (investorId) {
    filter.investorId = investorId;
    filter.ownerType = { $ne: "company" };
  }
  if (status) filter.status = status;
  if (q) {
    const textFilter = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { address: { $regex: q, $options: "i" } },
      ],
    };
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or as unknown[] }, textFilter];
      delete filter.$or;
    } else {
      Object.assign(filter, textFilter);
    }
  }

  const properties = await Property.find(filter).sort({ updatedAt: -1 }).lean();
  const investorIds = [
    ...new Set(
      properties
        .filter((p) => p.ownerType !== "company" && p.investorId)
        .map((p) => String(p.investorId))
    ),
  ];
  const investors = await Investor.find({ _id: { $in: investorIds } })
    .select("name email")
    .lean();
  const investorMap = new Map(
    investors.map((i) => [String(i._id), { name: i.name, email: i.email }])
  );

  return NextResponse.json({
    properties: properties.map((p) =>
      serializeProperty(p, investorMap.get(String(p.investorId)))
    ),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(2),
  status: z.enum(["active", "inactive", "sold"]).default("active"),
  purchasePrice: z.number().min(0).default(0),
  currentValue: z.number().min(0).default(0),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  const { user, response } = await assertAdmin("properties:write");
  if (response || !user) return response!;

  const contentType = request.headers.get("content-type") || "";

  async function uploadImages(files: FormDataEntryValue[]) {
    const imageUrls: string[] = [];
    for (const file of files) {
      if (file instanceof File && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());
        const uploaded = await uploadImageBuffer(buffer, "nova-elite/company");
        imageUrls.push(uploaded.url);
      }
    }
    return imageUrls;
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const parsed = createSchema.safeParse({
      name: form.get("name"),
      address: form.get("address"),
      status: form.get("status") || "active",
      purchasePrice: Number(form.get("purchasePrice") || 0),
      currentValue: Number(form.get("currentValue") || 0),
      notes: String(form.get("notes") || ""),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid property data." }, { status: 400 });
    }

    const imageUrls = await uploadImages(form.getAll("images"));
    const property = await Property.create({
      ownerType: "company",
      investorId: null,
      ...parsed.data,
      imageUrls,
    });

    await writeAudit({
      action: "company_property.create",
      summary: `Created company property ${property.name}`,
      actor: actorFromUser(user),
      entityType: "Property",
      entityId: String(property._id),
      investorVisible: false,
      changes: [
        {
          field: "property",
          oldValue: null,
          newValue: sanitizeAuditValue({
            name: property.name,
            address: property.address,
            status: property.status,
            purchasePrice: property.purchasePrice,
            currentValue: property.currentValue,
            notes: property.notes || "",
            imageUrls: property.imageUrls,
          }),
        },
      ],
      request,
    });

    return NextResponse.json({ property: serializeProperty(property) });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid property data." }, { status: 400 });
  }

  const property = await Property.create({
    ownerType: "company",
    investorId: null,
    ...parsed.data,
    imageUrls: Array.isArray(body.imageUrls) ? body.imageUrls : [],
  });

  await writeAudit({
    action: "company_property.create",
    summary: `Created company property ${property.name}`,
    actor: actorFromUser(user),
    entityType: "Property",
    entityId: String(property._id),
    investorVisible: false,
    changes: [
      {
        field: "property",
        oldValue: null,
        newValue: sanitizeAuditValue({
          name: property.name,
          address: property.address,
          status: property.status,
          purchasePrice: property.purchasePrice,
          currentValue: property.currentValue,
          notes: property.notes || "",
          imageUrls: property.imageUrls,
        }),
      },
    ],
    request,
  });

  return NextResponse.json({ property: serializeProperty(property) });
}
