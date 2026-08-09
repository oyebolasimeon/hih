import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { Property } from "@/models/Property";
import { Booking } from "@/models/Booking";
import {
  actorFromUser,
  sanitizeAuditValue,
  writeAudit,
} from "@/lib/audit";

const schema = z.object({
  propertyId: z.string().min(1),
  startDate: z.string().datetime().or(z.string().min(8)),
  endDate: z.string().datetime().or(z.string().min(8)),
  guestName: z.string().optional(),
  revenue: z.number().min(0).default(0),
  nightlyRate: z.number().min(0).default(0),
  channel: z.enum(["direct", "airbnb", "booking.com", "other"]).default("direct"),
  status: z.enum(["confirmed", "pending", "cancelled"]).default("confirmed"),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertAdmin("bookings:write");
  if (response || !user) return response!;

  const { id: investorId } = await context.params;
  const investor = await Investor.findById(investorId);
  if (!investor) {
    return NextResponse.json({ error: "Investor not found." }, { status: 404 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking data." }, { status: 400 });
  }

  const property = await Property.findOne({
    _id: parsed.data.propertyId,
    investorId,
  });
  if (!property) {
    return NextResponse.json({ error: "Property not found for investor." }, { status: 400 });
  }

  const booking = await Booking.create({
    investorId,
    propertyId: parsed.data.propertyId,
    startDate: new Date(parsed.data.startDate),
    endDate: new Date(parsed.data.endDate),
    guestName: parsed.data.guestName,
    revenue: parsed.data.revenue,
    nightlyRate: parsed.data.nightlyRate,
    channel: parsed.data.channel,
    status: parsed.data.status,
  });

  await writeAudit({
    action: "booking.create",
    summary: `Created booking for ${property.name}`,
    actor: actorFromUser(user),
    entityType: "Booking",
    entityId: String(booking._id),
    investorId,
    investorVisible: true,
    changes: [
      {
        field: "booking",
        oldValue: null,
        newValue: sanitizeAuditValue({
          propertyId: String(booking.propertyId),
          startDate: booking.startDate,
          endDate: booking.endDate,
          guestName: booking.guestName,
          revenue: booking.revenue,
          nightlyRate: booking.nightlyRate,
          channel: booking.channel,
          status: booking.status,
        }),
      },
    ],
    request,
  });

  return NextResponse.json({
    booking: {
      id: String(booking._id),
      propertyId: String(booking.propertyId),
      startDate: booking.startDate,
      endDate: booking.endDate,
      guestName: booking.guestName,
      revenue: booking.revenue,
      nightlyRate: booking.nightlyRate,
      channel: booking.channel,
      status: booking.status,
    },
  });
}
