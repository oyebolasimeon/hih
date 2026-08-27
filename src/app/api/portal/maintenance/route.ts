import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import {
  requireActiveProfile,
  notifyUser,
} from "@/lib/profile-context";
import { assertListingAccess } from "@/lib/property-access";
import { MaintenanceRequest } from "@/models/MaintenanceRequest";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";

function serializeRequest(
  r: Record<string, unknown>,
  extras?: { listingTitle?: string | null }
) {
  return {
    id: String(r._id),
    listingId: String(r.listingId),
    requesterUserId: String(r.requesterUserId),
    title: r.title,
    description: r.description,
    priority: r.priority,
    status: r.status,
    assignee: r.assignee || null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    listingTitle: extras?.listingTitle ?? null,
  };
}

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  await connectDB();
  const ownedListings = await Listing.find({ ownerUserId: user.id })
    .select("_id")
    .lean();
  const ownedIds = ownedListings.map((l) => l._id);

  const rows = await MaintenanceRequest.find({
    $or: [
      { requesterUserId: user.id },
      { listingId: { $in: ownedIds } },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const listingIds = [...new Set(rows.map((r) => String(r.listingId)))];
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title")
    .lean();
  const listingMap = new Map(listings.map((l) => [String(l._id), l]));

  return NextResponse.json({
    requests: rows.map((r) =>
      serializeRequest(r as unknown as Record<string, unknown>, {
        listingTitle: listingMap.get(String(r.listingId))?.title || null,
      })
    ),
  });
}

const createSchema = z.object({
  listingId: z.string().min(1),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(4000),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, [
    "tenant",
    "student",
    "landlord",
    "estate_manager",
  ]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid request." },
      { status: 400 }
    );
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.listingId)) {
    return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  }

  const access = await assertListingAccess({
    userId: user.id,
    profile: active.profile,
    listingId: parsed.data.listingId,
    requireLeaseForTenant: true,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const request = await MaintenanceRequest.create({
    listingId: access.listing._id,
    requesterUserId: user.id,
    title: parsed.data.title,
    description: parsed.data.description,
    priority: parsed.data.priority,
    status: "open",
  });

  if (access.role === "tenant") {
    const owner = await User.findById(access.listing.ownerUserId)
      .select("email name")
      .lean();
    if (owner) {
      await notifyUser({
        userId: String(owner._id),
        type: "maintenance.created",
        title: "New service request",
        body: `${parsed.data.title} on “${access.listing.title}” (${parsed.data.priority}).`,
        link: "/portal/maintenance",
        meta: {
          requestId: String(request._id),
          listingId: String(access.listing._id),
        },
        email: owner.email
          ? { to: owner.email, subject: "New service request" }
          : undefined,
      }).catch(() => undefined);
    }
  }

  return NextResponse.json(
    {
      request: serializeRequest(
        request.toObject() as unknown as Record<string, unknown>,
        { listingTitle: access.listing.title }
      ),
    },
    { status: 201 }
  );
}
