import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { mapVtpassCategory } from "@/lib/utility-catalog";
import { vtpassVerify } from "@/lib/vtpass";
import { requireActiveProfile } from "@/lib/profile-context";

const verifySchema = z.object({
  serviceID: z.string().min(1),
  vtpassCategory: z.string().min(1),
  accountNumber: z.string().trim().min(1).max(80),
  meterType: z.enum(["prepaid", "postpaid"]).optional(),
});

export async function POST(req: Request) {
  const { user, response } = await assertUser();
  if (response || !user) return response!;

  const active = await requireActiveProfile(user.id, ["tenant", "student"]);
  if (!active.ok) {
    return NextResponse.json({ error: active.error }, { status: active.status });
  }

  const body = await req.json().catch(() => null);
  const parsed = verifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid verification request." },
      { status: 400 }
    );
  }

  const meta = mapVtpassCategory(parsed.data.vtpassCategory);
  if (!meta.requiresVerify) {
    return NextResponse.json({
      verified: true,
      customerName: null,
      address: null,
      accountNumber: parsed.data.accountNumber,
      skipped: true,
    });
  }

  if (meta.requiresMeterType && !parsed.data.meterType) {
    return NextResponse.json(
      { error: "Select prepaid or postpaid meter type." },
      { status: 400 }
    );
  }

  try {
    const result = await vtpassVerify({
      serviceID: parsed.data.serviceID,
      billersCode: parsed.data.accountNumber,
      type: parsed.data.meterType,
    });

    return NextResponse.json({
      verified: true,
      customerName: result.customerName,
      address: result.address,
      accountNumber: result.accountNumber,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not verify account. Check the details and try again.",
      },
      { status: 422 }
    );
  }
}
