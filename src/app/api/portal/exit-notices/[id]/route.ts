import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/profile-context";
import { tenantExitAckText } from "@/lib/exit-notice-legal";
import { ExitNotice } from "@/models/ExitNotice";
import { Listing } from "@/models/Listing";
import { Profile } from "@/models/Profile";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid notice." }, { status: 400 });
  }

  await connectDB();
  const notice = await ExitNotice.findById(id).lean();
  if (!notice) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const profiles = await Profile.find({ userId: user.id }).select("_id").lean();
  const ids = new Set(profiles.map((p) => String(p._id)));
  const isTenant = ids.has(String(notice.tenantProfileId));
  const isLandlord = ids.has(String(notice.landlordProfileId));
  if (!isTenant && !isLandlord) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (
    isTenant &&
    !isLandlord &&
    notice.initiatedBy !== "tenant" &&
    !["served", "acknowledged", "completed"].includes(notice.status)
  ) {
    return NextResponse.json(
      { error: "This notice has not been served yet." },
      { status: 403 }
    );
  }

  const listing = await Listing.findById(notice.listingId)
    .select("title address")
    .lean();

  return NextResponse.json({
    notice: {
      id: String(notice._id),
      ...notice,
      _id: undefined,
      leaseId: String(notice.leaseId),
      listingId: String(notice.listingId),
      tenantProfileId: String(notice.tenantProfileId),
      landlordProfileId: String(notice.landlordProfileId),
      listing: listing
        ? {
            id: String(listing._id),
            title: listing.title,
            city: listing.address?.city,
            state: listing.address?.state,
          }
        : null,
      viewerRole: isTenant ? "tenant" : "landlord",
      ackText: tenantExitAckText({
        propertyTitle: listing?.title || "the property",
        proposedVacateDate: notice.proposedVacateDate,
        documentNumber: notice.documentNumber || String(notice._id).slice(-6),
      }),
    },
  });
}

const patchSchema = z.object({
  action: z.enum(["acknowledge", "cancel"]),
  acknowledged: z.literal(true).optional(),
});

export async function PATCH(req: Request, ctx: RouteCtx) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid notice." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await connectDB();
  const notice = await ExitNotice.findById(id);
  if (!notice) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const profiles = await Profile.find({ userId: user.id }).select("_id").lean();
  const ids = new Set(profiles.map((p) => String(p._id)));
  const isTenant = ids.has(String(notice.tenantProfileId));
  const isLandlord = ids.has(String(notice.landlordProfileId));

  if (parsed.data.action === "cancel") {
    if (!isLandlord && !isTenant) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (!["pending_ai", "pending_review"].includes(notice.status)) {
      return NextResponse.json(
        { error: "Only notices awaiting review can be cancelled." },
        { status: 409 }
      );
    }
    notice.status = "cancelled";
    await notice.save();
    await writeAudit({
      action: "exit_notice.cancel",
      summary: `Cancelled exit notice ${notice.documentNumber || notice._id}`,
      actor: actorFromUser(user),
      entityType: "exit_notice",
      entityId: String(notice._id),
      request: req,
    });
    return NextResponse.json({ ok: true, status: notice.status });
  }

  // acknowledge
  if (!isTenant) {
    return NextResponse.json(
      { error: "Only the tenant can acknowledge a served notice." },
      { status: 403 }
    );
  }
  if (notice.status !== "served") {
    return NextResponse.json(
      { error: "Notice must be served before acknowledgement." },
      { status: 409 }
    );
  }
  if (parsed.data.acknowledged !== true) {
    return NextResponse.json(
      { error: "You must confirm acknowledgement." },
      { status: 400 }
    );
  }

  const listing = await Listing.findById(notice.listingId).select("title").lean();
  const ack = tenantExitAckText({
    propertyTitle: listing?.title || "the property",
    proposedVacateDate: notice.proposedVacateDate,
    documentNumber: notice.documentNumber || String(notice._id).slice(-6),
  });
  notice.status = "acknowledged";
  notice.tenantAcknowledgedAt = new Date();
  notice.tenantAcknowledgementText = ack;
  await notice.save();

  const landlord = await Profile.findById(notice.landlordProfileId)
    .select("userId")
    .lean();
  if (landlord?.userId) {
    await notifyUser({
      userId: String(landlord.userId),
      type: "exit_notice.acknowledged",
      title: "Tenant acknowledged exit notice",
      body: `Tenant acknowledged ${notice.documentNumber || "exit notice"} for “${listing?.title || "property"}”.`,
      link: "/portal/exit-notices",
    }).catch(() => undefined);
  }

  await writeAudit({
    action: "exit_notice.acknowledge",
    summary: `Tenant acknowledged ${notice.documentNumber || notice._id}`,
    actor: actorFromUser(user),
    entityType: "exit_notice",
    entityId: String(notice._id),
    request: req,
  });

  return NextResponse.json({ ok: true, status: notice.status });
}
