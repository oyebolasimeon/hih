import { NextResponse } from "next/server";
import { assertInvestor } from "@/lib/api-auth";
import { Property } from "@/models/Property";

export async function GET() {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  const properties = await Property.find({ investorId: user.id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({
    properties: properties.map((p) => ({
      id: String(p._id),
      name: p.name,
      address: p.address,
      imageUrls: p.imageUrls,
      status: p.status,
      purchasePrice: p.purchasePrice,
      currentValue: p.currentValue,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  });
}
