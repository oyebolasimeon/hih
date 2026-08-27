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
import { PropertyService } from "@/models/PropertyService";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";

function serializeService(
  s: Record<string, unknown>,
  extras?: { listingTitle?: string | null }
) {
  return {
    id: String(s._id),
    listingId: String(s.listingId),
    name: s.name,
    description: s.description || "",
    category: s.category,
    price: s.price,
    currency: s.currency || "NGN",
    billing: s.billing,
    active: Boolean(s.active),
    listingTitle: extras?.listingTitle ?? null,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  await connectDB();
  const url = new URL(req.url);
  const listingId = url.searchParams.get("listingId");

  let filter: Record<string, unknown> = {};

  if (active.profile.type === "landlord" || active.profile.type === "estate_manager") {
    filter.ownerUserId = user.id;
    if (listingId && mongoose.Types.ObjectId.isValid(listingId)) {
      filter.listingId = listingId;
    }
  } else {
    // Tenants: active services on leased properties only
    const { getAccessibleProperties } = await import("@/lib/property-access");
    const properties = await getAccessibleProperties(user.id, active.profile);
    const leasedIds = properties.map((p) => p.listingId);
    if (!leasedIds.length) {
      return NextResponse.json({ services: [] });
    }
    filter = {
      listingId: { $in: leasedIds },
      active: true,
    };
    if (listingId && leasedIds.includes(listingId)) {
      filter.listingId = listingId;
    }
  }

  const rows = await PropertyService.find(filter)
    .sort({ updatedAt: -1 })
    .limit(100)
    .lean();

  const listingIds = [...new Set(rows.map((r) => String(r.listingId)))];
  const listings = await Listing.find({ _id: { $in: listingIds } })
    .select("title")
    .lean();
  const listingMap = new Map(listings.map((l) => [String(l._id), l.title]));

  return NextResponse.json({
    services: rows.map((s) =>
      serializeService(s as unknown as Record<string, unknown>, {
        listingTitle: listingMap.get(String(s.listingId)) || null,
      })
    ),
  });
}

const createSchema = z.object({
  listingId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  category: z.enum([
    "cleaning",
    "security",
    "waste",
    "generator",
    "water",
    "internet",
    "estate_dues",
    "maintenance",
    "other",
  ]),
  price: z.number().min(0).max(50_000_000),
  billing: z.enum(["one_time", "monthly", "yearly", "included"]),
  active: z.boolean().optional(),
});

export async function POST(req: Request) {
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

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid service." },
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
  });
  if (!access.ok || access.role !== "owner") {
    return NextResponse.json(
      { error: access.ok ? "Only the property owner can add services." : access.error },
      { status: access.ok ? 403 : access.status }
    );
  }

  const service = await PropertyService.create({
    listingId: access.listing._id,
    ownerUserId: user.id,
    ownerProfileId: active.profile._id,
    name: parsed.data.name,
    description: parsed.data.description || "",
    category: parsed.data.category,
    price: parsed.data.price,
    currency: "NGN",
    billing: parsed.data.billing,
    active: parsed.data.active ?? true,
  });

  // Notify active tenants on this listing
  const { Lease } = await import("@/models/Lease");
  const { Profile } = await import("@/models/Profile");
  const leases = await Lease.find({
    listingId: access.listing._id,
    status: "active",
  })
    .select("tenantProfileId")
    .lean();
  const tenantProfileIds = leases.map((l) => l.tenantProfileId);
  const tenants = await Profile.find({ _id: { $in: tenantProfileIds } })
    .select("userId")
    .lean();
  for (const t of tenants) {
    const tenantUser = await User.findById(t.userId).select("email").lean();
    await notifyUser({
      userId: String(t.userId),
      type: "service.added",
      title: "New property service",
      body: `${parsed.data.name} was added for “${access.listing.title}”.`,
      link: "/portal/services",
      email: tenantUser?.email
        ? { to: tenantUser.email, subject: "New property service available" }
        : undefined,
    }).catch(() => undefined);
  }

  return NextResponse.json(
    {
      service: serializeService(
        service.toObject() as unknown as Record<string, unknown>,
        { listingTitle: access.listing.title }
      ),
    },
    { status: 201 }
  );
}
