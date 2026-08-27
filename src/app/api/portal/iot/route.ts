import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { requireActiveProfile } from "@/lib/profile-context";
import { IoTDevice } from "@/models/IoTDevice";
import { Listing } from "@/models/Listing";

function serializeDevice(d: Record<string, unknown>) {
  return {
    id: String(d._id),
    profileId: String(d.profileId),
    listingId: d.listingId ? String(d.listingId) : null,
    name: d.name,
    type: d.type,
    status: d.status,
    externalId: d.externalId || null,
    lastTelemetry: d.lastTelemetry || null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, [
    "landlord",
    "estate_manager",
    "tenant",
  ]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  await connectDB();
  const rows = await IoTDevice.find({ profileId: active.profile._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  return NextResponse.json({
    devices: rows.map((d) =>
      serializeDevice(d as unknown as Record<string, unknown>)
    ),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.enum(["lock", "meter", "sensor"]),
  listingId: z.string().min(1).optional(),
  externalId: z.string().trim().max(120).optional(),
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

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid device." },
      { status: 400 }
    );
  }

  if (
    parsed.data.listingId &&
    !mongoose.Types.ObjectId.isValid(parsed.data.listingId)
  ) {
    return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  }

  await connectDB();
  if (parsed.data.listingId) {
    const listing = await Listing.findById(parsed.data.listingId).lean();
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    if (String(listing.ownerUserId) !== user.id) {
      return NextResponse.json(
        { error: "You can only attach devices to your own listings." },
        { status: 403 }
      );
    }
  }

  const device = await IoTDevice.create({
    profileId: active.profile._id,
    listingId: parsed.data.listingId || undefined,
    name: parsed.data.name,
    type: parsed.data.type,
    status: "pairing",
    externalId: parsed.data.externalId || `hih_${Date.now()}`,
    lastTelemetry: { pairedAt: new Date().toISOString(), signal: "weak" },
  });

  return NextResponse.json(
    {
      device: serializeDevice(
        device.toObject() as unknown as Record<string, unknown>
      ),
    },
    { status: 201 }
  );
}
