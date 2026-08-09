import { NextResponse } from "next/server";
import { z } from "zod";
import { assertInvestor } from "@/lib/api-auth";
import { Property } from "@/models/Property";
import { InvestmentInterest } from "@/models/InvestmentInterest";
import { projectInvestment, formatPeriod } from "@/lib/investment";
import { serializeInvestmentFields } from "@/lib/property-investment-fields";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  const { id } = await context.params;
  const property = await Property.findOne({
    _id: id,
    ownerType: "company",
    listedForInvestment: true,
    status: "active",
  }).lean();

  if (!property) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  const invest = serializeInvestmentFields(property);
  const { searchParams } = new URL(request.url);
  const amountParam = Number(searchParams.get("amount") || invest.minInvestment || 1000);
  const projection = projectInvestment({
    amount: amountParam,
    roiMode: invest.roiMode as "percent" | "fixed_per_1000",
    roiValue: invest.roiValue,
    roiPeriodMonths: invest.roiPeriodMonths,
  });

  const myInterests = await InvestmentInterest.find({
    investorId: user.id,
    propertyId: id,
  })
    .sort({ createdAt: -1 })
    .lean();

  const pledgedTotal = await InvestmentInterest.aggregate([
    {
      $match: {
        propertyId: property._id,
        status: { $in: ["pending", "contacted", "accepted"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
  ]);

  return NextResponse.json({
    property: {
      id: String(property._id),
      name: property.name,
      address: property.address,
      imageUrls: property.imageUrls || [],
      status: property.status,
      purchasePrice: property.purchasePrice,
      currentValue: property.currentValue,
      ...invest,
      periodLabel: formatPeriod(invest.roiPeriodMonths),
    },
    projection,
    interestTotals: {
      pledgedAmount: pledgedTotal[0]?.total || 0,
      pledgeCount: pledgedTotal[0]?.count || 0,
    },
    myInterests: myInterests.map((i) => ({
      id: String(i._id),
      amount: i.amount,
      status: i.status,
      projectedProfit: i.projectedProfit,
      projectedTotalReturn: i.projectedTotalReturn,
      annualizedRoiPercent: i.annualizedRoiPercent,
      createdAt: i.createdAt,
    })),
  });
}

const calcSchema = z.object({
  amount: z.number().positive(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await assertInvestor();
  if (response) return response;

  const { id } = await context.params;
  const property = await Property.findOne({
    _id: id,
    ownerType: "company",
    listedForInvestment: true,
    status: "active",
  }).lean();

  if (!property) {
    return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = calcSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }

  const projection = projectInvestment({
    amount: parsed.data.amount,
    roiMode: property.roiMode,
    roiValue: property.roiValue,
    roiPeriodMonths: property.roiPeriodMonths,
  });

  return NextResponse.json({ projection });
}
