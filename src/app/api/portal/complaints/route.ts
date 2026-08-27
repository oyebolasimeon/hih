import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import {
  requireActiveProfile,
  requireVerifiedProfile,
  notifyUser,
} from "@/lib/profile-context";
import { assertListingAccess } from "@/lib/property-access";
import { Complaint } from "@/models/Complaint";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";

function serializeComplaint(
  c: Record<string, unknown>,
  extras?: { listingTitle?: string | null }
) {
  return {
    id: String(c._id),
    listingId: String(c.listingId),
    leaseId: c.leaseId ? String(c.leaseId) : null,
    reporterUserId: String(c.reporterUserId),
    category: c.category,
    title: c.title,
    details: c.details,
    status: c.status,
    landlordNotes: c.landlordNotes || "",
    listingTitle: extras?.listingTitle ?? null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    resolvedAt: c.resolvedAt || null,
  };
}

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  await connectDB();
  const isLandlordLike =
    active.profile.type === "landlord" ||
    active.profile.type === "estate_manager";

  const filter = isLandlordLike
    ? { landlordUserId: user.id }
    : { reporterUserId: user.id };

  const rows = await Complaint.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  const listingIds = [...new Set(rows.map((r) => String(r.listingId)))];
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title")
    .lean();
  const listingMap = new Map(listings.map((l) => [String(l._id), l.title]));

  return NextResponse.json({
    complaints: rows.map((c) =>
      serializeComplaint(c as unknown as Record<string, unknown>, {
        listingTitle: listingMap.get(String(c.listingId)) || null,
      })
    ),
  });
}

const createSchema = z.object({
  listingId: z.string().min(1),
  category: z.enum([
    "noise",
    "billing",
    "maintenance",
    "safety",
    "neighbor",
    "lease",
    "other",
  ]),
  title: z.string().trim().min(3).max(160),
  details: z.string().trim().min(5).max(4000),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, ["tenant", "student"]);
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

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid complaint." },
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
  if (!access.ok || access.role !== "tenant") {
    return NextResponse.json(
      {
        error: access.ok
          ? "Complaints are for tenants on a leased property."
          : access.error,
      },
      { status: access.ok ? 403 : access.status }
    );
  }

  const complaint = await Complaint.create({
    listingId: access.listing._id,
    leaseId: access.leaseId,
    reporterUserId: user.id,
    reporterProfileId: active.profile._id,
    landlordUserId: access.listing.ownerUserId,
    category: parsed.data.category,
    title: parsed.data.title,
    details: parsed.data.details,
    status: "open",
  });

  const owner = await User.findById(access.listing.ownerUserId)
    .select("email name")
    .lean();
  if (owner) {
    await notifyUser({
      userId: String(owner._id),
      type: "complaint.created",
      title: "New tenant complaint",
      body: `${parsed.data.title} on “${access.listing.title}”.`,
      link: "/portal/complaints",
      meta: { complaintId: String(complaint._id) },
      email: owner.email
        ? { to: owner.email, subject: "New tenant complaint" }
        : undefined,
    }).catch(() => undefined);
  }

  return NextResponse.json(
    {
      complaint: serializeComplaint(
        complaint.toObject() as unknown as Record<string, unknown>,
        { listingTitle: access.listing.title }
      ),
    },
    { status: 201 }
  );
}
