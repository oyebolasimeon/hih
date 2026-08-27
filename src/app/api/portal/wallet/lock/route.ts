import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import {
  applyRentLock,
  lockFundsForRent,
  serializeRentLock,
  serializeWallet,
  unlockRentFunds,
} from "@/lib/wallet";

const lockSchema = z.object({
  profileId: z.string().min(1),
  leaseId: z.string().min(1),
  amount: z.number().positive().optional(),
});

const applySchema = z.object({
  profileId: z.string().min(1),
  lockId: z.string().min(1),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = lockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid lock request." },
      { status: 400 }
    );
  }
  if (
    !mongoose.Types.ObjectId.isValid(parsed.data.profileId) ||
    !mongoose.Types.ObjectId.isValid(parsed.data.leaseId)
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await connectDB();

  try {
    const result = await lockFundsForRent({
      profileId: new mongoose.Types.ObjectId(parsed.data.profileId),
      userId: user.id,
      leaseId: new mongoose.Types.ObjectId(parsed.data.leaseId),
      amount: parsed.data.amount,
    });

    await writeAudit({
      action: "wallet.rent_lock",
      summary: `Locked ${result.lock.currency} ${result.lock.amount} for next rent`,
      actor: actorFromUser(user),
      entityType: "rent_lock",
      entityId: String(result.lock._id),
      metadata: {
        leaseId: parsed.data.leaseId,
        profileId: parsed.data.profileId,
      },
      request: req,
    });

    return NextResponse.json({
      lock: serializeRentLock(result.lock),
      wallet: serializeWallet(result.wallet),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not lock funds." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const url = new URL(req.url);
  const lockId = url.searchParams.get("lockId") || "";
  const profileId = url.searchParams.get("profileId") || "";
  if (
    !lockId ||
    !profileId ||
    !mongoose.Types.ObjectId.isValid(lockId) ||
    !mongoose.Types.ObjectId.isValid(profileId)
  ) {
    return NextResponse.json(
      { error: "lockId and profileId are required." },
      { status: 400 }
    );
  }

  await connectDB();

  try {
    const result = await unlockRentFunds({
      profileId: new mongoose.Types.ObjectId(profileId),
      userId: user.id,
      lockId: new mongoose.Types.ObjectId(lockId),
    });

    await writeAudit({
      action: "wallet.rent_unlock",
      summary: `Released ${result.lock.currency} ${result.lock.amount} from rent reserve`,
      actor: actorFromUser(user),
      entityType: "rent_lock",
      entityId: String(result.lock._id),
      metadata: { profileId, lockId },
      request: req,
    });

    return NextResponse.json({
      lock: serializeRentLock(result.lock),
      wallet: serializeWallet(result.wallet),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not unlock funds." },
      { status: 400 }
    );
  }
}

export async function PUT(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = applySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid apply request." },
      { status: 400 }
    );
  }
  if (
    !mongoose.Types.ObjectId.isValid(parsed.data.profileId) ||
    !mongoose.Types.ObjectId.isValid(parsed.data.lockId)
  ) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  await connectDB();

  try {
    const result = await applyRentLock({
      profileId: new mongoose.Types.ObjectId(parsed.data.profileId),
      userId: user.id,
      lockId: new mongoose.Types.ObjectId(parsed.data.lockId),
      actor: actorFromUser(user) || { kind: "user", name: user.name || "User" },
    });

    return NextResponse.json({
      lock: serializeRentLock(result.lock),
      paymentId: String(result.payment._id),
      wallet: serializeWallet(result.wallet),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Could not apply reserved funds.",
      },
      { status: 400 }
    );
  }
}
