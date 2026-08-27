import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { getRentStatus } from "@/lib/wallet";
import { Lease } from "@/models/Lease";
import { Profile } from "@/models/Profile";

export async function GET(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const url = new URL(req.url);
  const leaseId = url.searchParams.get("leaseId") || "";
  if (!leaseId || !mongoose.Types.ObjectId.isValid(leaseId)) {
    return NextResponse.json({ error: "leaseId is required." }, { status: 400 });
  }

  await connectDB();
  const lease = await Lease.findById(leaseId).lean();
  if (!lease) {
    return NextResponse.json({ error: "Lease not found." }, { status: 404 });
  }

  const profiles = await Profile.find({ userId: user.id }).select("_id").lean();
  const profileIds = new Set(profiles.map((p) => String(p._id)));
  const allowed =
    profileIds.has(String(lease.tenantProfileId)) ||
    profileIds.has(String(lease.landlordProfileId));
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const status = await getRentStatus(new mongoose.Types.ObjectId(leaseId));
  return NextResponse.json({ rentStatus: status });
}
