import { NextResponse } from "next/server";
import { z } from "zod";
import { assertUser } from "@/lib/api-auth";
import { getProviderById } from "@/lib/utility-providers";
import { vtpassVerify } from "@/lib/vtpass";
import { requireActiveProfile } from "@/lib/profile-context";

const verifySchema = z.object({
  providerId: z.string().min(1),
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

  const provider = getProviderById(parsed.data.providerId);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider." }, { status: 400 });
  }

  if (!provider.integrated) {
    return NextResponse.json({
      verified: true,
      customerName: null,
      address: null,
      accountNumber: parsed.data.accountNumber,
      manual: true,
    });
  }

  if (provider.requiresMeterType && !parsed.data.meterType) {
    return NextResponse.json(
      { error: "Select prepaid or postpaid meter type." },
      { status: 400 }
    );
  }

  try {
    const result = await vtpassVerify({
      serviceID: provider.id,
      billersCode: parsed.data.accountNumber,
      type: parsed.data.meterType,
    });

    return NextResponse.json({
      verified: true,
      customerName: result.customerName,
      address: result.address,
      accountNumber: result.accountNumber,
      provider: provider.name,
      manual: false,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not verify account. Check the number and try again.",
      },
      { status: 422 }
    );
  }
}
