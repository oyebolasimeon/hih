import { NextResponse } from "next/server";
import { z } from "zod";
import mongoose from "mongoose";
import { assertUser } from "@/lib/api-auth";
import { connectDB, dbConnectionErrorMessage, isDbConnectionError } from "@/lib/db";
import { actorFromUser, writeAudit } from "@/lib/audit";
import { saveWalletBankDetails } from "@/lib/wallet";
import { paystackListBanks } from "@/lib/paystack";

const bankSchema = z.object({
  profileId: z.string().min(1),
  bankCode: z.string().trim().min(2).max(8),
  bankName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().min(10).max(20),
  accountName: z.string().trim().min(2).max(120),
});

export async function GET() {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  try {
    const banks = await paystackListBanks();
    return NextResponse.json({ banks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load banks." },
      { status: 502 }
    );
  }
}

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const body = await req.json().catch(() => null);
  const parsed = bankSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid bank details." },
      { status: 400 }
    );
  }
  if (!mongoose.Types.ObjectId.isValid(parsed.data.profileId)) {
    return NextResponse.json({ error: "Invalid profile." }, { status: 400 });
  }

  try {
    await connectDB();

    const wallet = await saveWalletBankDetails({
      profileId: new mongoose.Types.ObjectId(parsed.data.profileId),
      userId: user.id,
      bankCode: parsed.data.bankCode,
      bankName: parsed.data.bankName,
      accountNumber: parsed.data.accountNumber,
      accountName: parsed.data.accountName,
    });

    await writeAudit({
      action: "wallet.bank_saved",
      summary: `Payout bank saved (${parsed.data.bankName})`,
      actor: actorFromUser(user),
      entityType: "wallet",
      entityId: String(wallet._id),
      metadata: {
        profileId: parsed.data.profileId,
        bankName: parsed.data.bankName,
        accountNumberLast4: wallet.bankDetails?.accountNumberLast4,
      },
      request: req,
    });

    return NextResponse.json({
      wallet: {
        id: String(wallet._id),
        bankDetails: wallet.bankDetails
          ? {
              bankName: wallet.bankDetails.bankName,
              accountName: wallet.bankDetails.accountName,
              accountNumberLast4: wallet.bankDetails.accountNumberLast4,
              bankCode: wallet.bankDetails.bankCode,
            }
          : null,
      },
    });
  } catch (err) {
    if (isDbConnectionError(err)) {
      console.error("wallet/bank DB error:", err);
      return NextResponse.json(
        { error: dbConnectionErrorMessage() },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save bank account." },
      { status: 400 }
    );
  }
}
