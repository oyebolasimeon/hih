import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { Property } from "@/models/Property";

export async function GET(request: Request) {
  const { user, response } = await assertAdmin("investors:read");
  if (response || !user) return response!;

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  const filter = q
    ? {
        $or: [
          { name: { $regex: q, $options: "i" } },
          { email: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const investors = await Investor.find(filter).sort({ createdAt: -1 }).lean();
  const counts = await Property.aggregate([
    { $group: { _id: "$investorId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count as number]));

  return NextResponse.json({
    investors: investors.map((inv) => ({
      id: String(inv._id),
      name: inv.name,
      email: inv.email,
      totalInvested: inv.totalInvested,
      totalReturns: inv.totalReturns,
      portfolioValue: inv.portfolioValue,
      propertyCount: countMap.get(String(inv._id)) || 0,
      createdAt: inv.createdAt,
    })),
  });
}
