import { NextResponse } from "next/server";
import { z } from "zod";
import { assertInvestor } from "@/lib/api-auth";
import { Property } from "@/models/Property";
import { InvestmentInterest } from "@/models/InvestmentInterest";
import { projectInvestment, formatPeriod } from "@/lib/investment";
import { serializeInvestmentFields } from "@/lib/property-investment-fields";
import {
  actorFromUser,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

function publicListing(p: {
  _id: unknown;
  name: string;
  address: string;
  imageUrls: string[];
  status: string;
  purchasePrice: number;
  currentValue: number;
  description?: string;
  listedForInvestment?: boolean;
  roiMode?: string;
  roiValue?: number;
  roiPeriodMonths?: number;
  minInvestment?: number;
  maxInvestment?: number | null;
  targetRaise?: number | null;
  highlights?: string[];
}) {
  const invest = serializeInvestmentFields(p);
  const sample = projectInvestment({
    amount: Math.max(invest.minInvestment || 1000, 1000),
    roiMode: invest.roiMode as "percent" | "fixed_per_1000",
    roiValue: invest.roiValue,
    roiPeriodMonths: invest.roiPeriodMonths,
  });

  return {
    id: String(p._id),
    name: p.name,
    address: p.address,
    imageUrls: p.imageUrls || [],
    status: p.status,
    purchasePrice: p.purchasePrice,
    currentValue: p.currentValue,
    ...invest,
    periodLabel: formatPeriod(invest.roiPeriodMonths),
    sampleProjection: sample,
  };
}

export async function GET() {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  const properties = await Property.find({
    ownerType: "company",
    listedForInvestment: true,
    status: "active",
  })
    .sort({ updatedAt: -1 })
    .lean();

  const interests = await InvestmentInterest.find({
    investorId: user.id,
    propertyId: { $in: properties.map((p) => p._id) },
  })
    .sort({ createdAt: -1 })
    .lean();

  const interestByProperty = new Map<string, (typeof interests)[0]>();
  for (const row of interests) {
    const key = String(row.propertyId);
    if (!interestByProperty.has(key)) interestByProperty.set(key, row);
  }

  return NextResponse.json({
    properties: properties.map((p) => {
      const listing = publicListing(p);
      const mine = interestByProperty.get(String(p._id));
      return {
        ...listing,
        myInterest: mine
          ? {
              id: String(mine._id),
              amount: mine.amount,
              status: mine.status,
              projectedProfit: mine.projectedProfit,
              projectedTotalReturn: mine.projectedTotalReturn,
              createdAt: mine.createdAt,
            }
          : null,
      };
    }),
  });
}

const pledgeSchema = z.object({
  propertyId: z.string().min(1),
  amount: z.number().positive(),
  note: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  const body = await request.json();
  const parsed = pledgeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid investment amount." }, { status: 400 });
  }

  const property = await Property.findOne({
    _id: parsed.data.propertyId,
    ownerType: "company",
    listedForInvestment: true,
    status: "active",
  });

  if (!property) {
    return NextResponse.json(
      { error: "This opportunity is not available." },
      { status: 404 }
    );
  }

  const amount = parsed.data.amount;
  if (amount < (property.minInvestment || 0)) {
    return NextResponse.json(
      {
        error: `Minimum investment is £${property.minInvestment.toLocaleString("en-GB")}.`,
      },
      { status: 400 }
    );
  }
  if (property.maxInvestment != null && amount > property.maxInvestment) {
    return NextResponse.json(
      {
        error: `Maximum investment is £${property.maxInvestment.toLocaleString("en-GB")}.`,
      },
      { status: 400 }
    );
  }

  const projection = projectInvestment({
    amount,
    roiMode: property.roiMode,
    roiValue: property.roiValue,
    roiPeriodMonths: property.roiPeriodMonths,
  });

  const interest = await InvestmentInterest.create({
    investorId: user.id,
    propertyId: property._id,
    amount,
    status: "pending",
    projectedProfit: projection.profit,
    projectedTotalReturn: projection.totalReturn,
    annualizedRoiPercent: projection.annualizedRoiPercent,
    monthlyAverageProfit: projection.monthlyAverageProfit,
    multiple: projection.multiple,
    roiMode: property.roiMode,
    roiValue: property.roiValue,
    roiPeriodMonths: property.roiPeriodMonths,
    note: parsed.data.note || "",
  });

  await writeAudit({
    action: "investment.interest_submit",
    summary: `${user.name || user.email} expressed interest of £${amount} in ${property.name}`,
    actor: actorFromUser(user),
    entityType: "InvestmentInterest",
    entityId: String(interest._id),
    investorId: user.id,
    investorVisible: true,
    changes: [
      {
        field: "interest",
        oldValue: null,
        newValue: sanitizeAuditValue({
          propertyId: String(property._id),
          propertyName: property.name,
          amount,
          projection,
          status: "pending",
        }),
      },
    ],
    request,
  });

  return NextResponse.json({
    interest: {
      id: String(interest._id),
      amount: interest.amount,
      status: interest.status,
      projectedProfit: interest.projectedProfit,
      projectedTotalReturn: interest.projectedTotalReturn,
      annualizedRoiPercent: interest.annualizedRoiPercent,
      monthlyAverageProfit: interest.monthlyAverageProfit,
      multiple: interest.multiple,
      periodMonths: interest.roiPeriodMonths,
    },
  });
}
