import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { Property } from "@/models/Property";
import { Booking } from "@/models/Booking";
import { Analytics } from "@/models/Analytics";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  totalInvested: z.number().min(0).optional(),
  totalReturns: z.number().min(0).optional(),
  portfolioValue: z.number().min(0).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("investors:read");
  if (response || !user) return response!;

  const { id } = await context.params;
  const investor = await Investor.findById(id).lean();
  if (!investor) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }

  const [properties, bookings, analytics] = await Promise.all([
    Property.find({
      investorId: id,
      ownerType: { $ne: "company" },
    })
      .sort({ createdAt: -1 })
      .lean(),
    Booking.find({ investorId: id }).sort({ startDate: -1 }).lean(),
    Analytics.find({ investorId: id }).sort({ period: -1 }).lean(),
  ]);

  return NextResponse.json({
    investor: {
      id: String(investor._id),
      name: investor.name,
      email: investor.email,
      totalInvested: investor.totalInvested,
      totalReturns: investor.totalReturns,
      portfolioValue: investor.portfolioValue,
    },
    properties: properties.map((p) => ({
      id: String(p._id),
      name: p.name,
      address: p.address,
      imageUrls: p.imageUrls,
      status: p.status,
      purchasePrice: p.purchasePrice,
      currentValue: p.currentValue,
    })),
    bookings: bookings.map((b) => ({
      id: String(b._id),
      propertyId: String(b.propertyId),
      startDate: b.startDate,
      endDate: b.endDate,
      guestName: b.guestName,
      revenue: b.revenue,
      channel: b.channel,
      status: b.status,
    })),
    analytics: analytics.map((a) => ({
      id: String(a._id),
      period: a.period,
      revenue: a.revenue,
      commission: a.commission,
      occupancyRate: a.occupancyRate,
      channelBreakdown:
        a.channelBreakdown instanceof Map
          ? Object.fromEntries(a.channelBreakdown)
          : a.channelBreakdown || {},
    })),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("investors:write");
  if (response || !user) return response!;

  const { id } = await context.params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid investor payload." }, { status: 400 });
  }

  const investor = await Investor.findByIdAndUpdate(id, parsed.data, {
    new: true,
  }).lean();

  if (!investor) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }

  return NextResponse.json({
    investor: {
      id: String(investor._id),
      name: investor.name,
      email: investor.email,
      totalInvested: investor.totalInvested,
      totalReturns: investor.totalReturns,
      portfolioValue: investor.portfolioValue,
    },
  });
}
