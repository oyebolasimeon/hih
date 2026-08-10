import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { MaintenanceRequest } from "@/models/MaintenanceRequest";
import { Listing } from "@/models/Listing";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(["open", "assigned", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  assignee: z.string().trim().max(120).optional(),
});

export async function PATCH(req: Request, ctx: Ctx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid payload." },
      { status: 400 }
    );
  }

  await connectDB();
  const request = await MaintenanceRequest.findById(id);
  if (!request) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const listing = await Listing.findById(request.listingId)
    .select("ownerUserId title")
    .lean();
  const isOwner = listing && String(listing.ownerUserId) === user.id;
  const isRequester = String(request.requesterUserId) === user.id;
  if (!isOwner && !isRequester) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (parsed.data.status !== undefined) request.status = parsed.data.status;
  if (parsed.data.priority !== undefined) request.priority = parsed.data.priority;
  if (parsed.data.assignee !== undefined) {
    request.assignee = parsed.data.assignee;
    if (parsed.data.assignee && request.status === "open") {
      request.status = "assigned";
    }
  }
  await request.save();

  return NextResponse.json({
    request: {
      id: String(request._id),
      listingId: String(request.listingId),
      requesterUserId: String(request.requesterUserId),
      title: request.title,
      description: request.description,
      priority: request.priority,
      status: request.status,
      assignee: request.assignee || null,
      listingTitle: listing?.title || null,
      updatedAt: request.updatedAt,
    },
  });
}
