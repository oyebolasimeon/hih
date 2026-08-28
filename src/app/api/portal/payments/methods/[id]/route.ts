import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { PaymentMethod } from "@/models/PaymentMethod";
import { Profile } from "@/models/Profile";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid card." }, { status: 400 });
  }

  await connectDB();
  const method = await PaymentMethod.findById(id);
  if (!method || String(method.userId) !== user.id) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  method.active = false;
  method.isDefault = false;
  await method.save();

  const next = await PaymentMethod.findOne({
    profileId: method.profileId,
    active: true,
  }).sort({ createdAt: -1 });
  if (next) {
    next.isDefault = true;
    await next.save();
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid card." }, { status: 400 });
  }

  await connectDB();
  const method = await PaymentMethod.findById(id);
  if (!method || String(method.userId) !== user.id) {
    return NextResponse.json({ error: "Card not found." }, { status: 404 });
  }

  await PaymentMethod.updateMany(
    { profileId: method.profileId, active: true },
    { isDefault: false }
  );
  method.isDefault = true;
  await method.save();

  return NextResponse.json({ ok: true });
}
