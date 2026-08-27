import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import {
  requireActiveProfile,
  requireVerifiedProfile,
} from "@/lib/profile-context";
import { PropertyService } from "@/models/PropertyService";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).optional(),
  category: z
    .enum([
      "cleaning",
      "security",
      "waste",
      "generator",
      "water",
      "internet",
      "estate_dues",
      "maintenance",
      "other",
    ])
    .optional(),
  price: z.number().min(0).max(50_000_000).optional(),
  billing: z.enum(["one_time", "monthly", "yearly", "included"]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, [
    "landlord",
    "estate_manager",
  ]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }
  const verified = requireVerifiedProfile(active.profile);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error },
      { status: verified.status }
    );
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid service." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid update." },
      { status: 400 }
    );
  }

  await connectDB();
  const service = await PropertyService.findOne({
    _id: id,
    ownerUserId: user.id,
  });
  if (!service) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  if (parsed.data.name !== undefined) service.name = parsed.data.name;
  if (parsed.data.description !== undefined) {
    service.description = parsed.data.description;
  }
  if (parsed.data.category !== undefined) service.category = parsed.data.category;
  if (parsed.data.price !== undefined) service.price = parsed.data.price;
  if (parsed.data.billing !== undefined) service.billing = parsed.data.billing;
  if (parsed.data.active !== undefined) service.active = parsed.data.active;
  await service.save();

  return NextResponse.json({
    service: {
      id: String(service._id),
      listingId: String(service.listingId),
      name: service.name,
      description: service.description || "",
      category: service.category,
      price: service.price,
      currency: service.currency,
      billing: service.billing,
      active: service.active,
    },
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, [
    "landlord",
    "estate_manager",
  ]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid service." }, { status: 400 });
  }

  await connectDB();
  const service = await PropertyService.findOne({
    _id: id,
    ownerUserId: user.id,
  });
  if (!service) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  await service.deleteOne();
  return NextResponse.json({ ok: true });
}
