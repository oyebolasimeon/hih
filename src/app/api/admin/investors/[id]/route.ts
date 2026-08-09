import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { Property } from "@/models/Property";
import { Booking } from "@/models/Booking";
import { Analytics } from "@/models/Analytics";
import { User } from "@/models/User";
import { actorFromUser, diffObjects, leanDoc, writeAudit } from "@/lib/audit";
import { serializeProperty } from "@/lib/property-fields";

const updateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(40).optional(),
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

  const [properties, bookings, analytics, account] = await Promise.all([
    Property.find({
      investorId: id,
      ownerType: { $ne: "company" },
    })
      .sort({ createdAt: -1 })
      .lean(),
    Booking.find({ investorId: id }).sort({ startDate: -1 }).lean(),
    Analytics.find({ investorId: id }).sort({ period: -1 }).lean(),
    User.findById(id).select("phone").lean(),
  ]);

  return NextResponse.json({
    investor: {
      id: String(investor._id),
      name: investor.name,
      email: investor.email,
      phone: account?.phone || "",
      totalInvested: investor.totalInvested,
      totalReturns: investor.totalReturns,
      portfolioValue: investor.portfolioValue,
      createdAt: investor.createdAt,
    },
    properties: properties.map(serializeProperty),
    bookings: bookings.map((b) => ({
      id: String(b._id),
      propertyId: String(b.propertyId),
      startDate: b.startDate,
      endDate: b.endDate,
      guestName: b.guestName,
      revenue: b.revenue,
      nightlyRate: b.nightlyRate || 0,
      channel: b.channel,
      status: b.status,
    })),
    analytics: analytics.map((a) => ({
      id: String(a._id),
      period: a.period,
      revenue: a.revenue,
      commission: a.commission,
      occupancyRate: a.occupancyRate,
      avgNightlyRate: a.avgNightlyRate || 0,
      revenuePAL: a.revenuePAL || 0,
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

  const before = await Investor.findById(id).lean();
  if (!before) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }

  const { phone, ...investorFields } = parsed.data;

  const investor = await Investor.findByIdAndUpdate(id, investorFields, {
    new: true,
  }).lean();

  if (!investor) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }

  const userUpdates: { phone?: string; name?: string } = {};
  if (phone !== undefined) userUpdates.phone = phone;
  if (investorFields.name) userUpdates.name = investorFields.name;
  if (Object.keys(userUpdates).length) {
    await User.findByIdAndUpdate(id, userUpdates);
  }

  const account = await User.findById(id).select("phone").lean();

  await writeAudit({
    action: "investor.update",
    summary: `Updated investor ${investor.name}`,
    actor: actorFromUser(user),
    entityType: "Investor",
    entityId: String(investor._id),
    investorId: String(investor._id),
    investorVisible: true,
    changes: diffObjects(leanDoc(before), leanDoc(investor), [
      "name",
      "totalInvested",
      "totalReturns",
      "portfolioValue",
    ]),
    request,
  });

  return NextResponse.json({
    investor: {
      id: String(investor._id),
      name: investor.name,
      email: investor.email,
      phone: account?.phone || "",
      totalInvested: investor.totalInvested,
      totalReturns: investor.totalReturns,
      portfolioValue: investor.portfolioValue,
      createdAt: investor.createdAt,
    },
  });
}
