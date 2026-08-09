import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import { Property } from "@/models/Property";
import { Investor } from "@/models/Investor";

export async function GET(request: Request) {
  const { user, response } = await assertAdmin("properties:read");
  if (response || !user) return response!;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const investorId = searchParams.get("investorId") || "";
  const status = searchParams.get("status") || "";

  const filter: Record<string, unknown> = {};
  if (investorId) filter.investorId = investorId;
  if (status) filter.status = status;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { address: { $regex: q, $options: "i" } },
    ];
  }

  const properties = await Property.find(filter).sort({ updatedAt: -1 }).lean();
  const investorIds = [...new Set(properties.map((p) => String(p.investorId)))];
  const investors = await Investor.find({ _id: { $in: investorIds } })
    .select("name email")
    .lean();
  const investorMap = new Map(
    investors.map((i) => [String(i._id), { name: i.name, email: i.email }])
  );

  return NextResponse.json({
    properties: properties.map((p) => {
      const inv = investorMap.get(String(p.investorId));
      return {
        id: String(p._id),
        investorId: String(p.investorId),
        investorName: inv?.name || "Unknown",
        investorEmail: inv?.email || "",
        name: p.name,
        address: p.address,
        imageUrls: p.imageUrls,
        status: p.status,
        purchasePrice: p.purchasePrice,
        currentValue: p.currentValue,
        updatedAt: p.updatedAt,
      };
    }),
  });
}
