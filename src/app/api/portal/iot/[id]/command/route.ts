import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { requireActiveProfile } from "@/lib/profile-context";
import { IoTDevice } from "@/models/IoTDevice";

type Ctx = { params: Promise<{ id: string }> };

const commandSchema = z.object({
  command: z.enum(["lock", "unlock", "sync"]),
});

export async function POST(req: Request, ctx: Ctx) {
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

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid device." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = commandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid command." },
      { status: 400 }
    );
  }

  await connectDB();
  const device = await IoTDevice.findOne({
    _id: id,
    profileId: active.profile._id,
  });
  if (!device) {
    return NextResponse.json({ error: "Device not found." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const telemetry: Record<string, unknown> = {
    ...(device.lastTelemetry || {}),
    lastCommand: parsed.data.command,
    commandedAt: now,
    mock: true,
  };

  if (parsed.data.command === "lock") {
    telemetry.locked = true;
  } else if (parsed.data.command === "unlock") {
    telemetry.locked = false;
  } else {
    telemetry.signal = "strong";
    telemetry.batteryPct = 92;
  }

  device.status = "online";
  device.lastTelemetry = telemetry;
  await device.save();

  return NextResponse.json({
    device: {
      id: String(device._id),
      name: device.name,
      type: device.type,
      status: device.status,
      lastTelemetry: device.lastTelemetry,
    },
  });
}
