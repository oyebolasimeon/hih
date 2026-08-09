import { NextResponse } from "next/server";
import { z } from "zod";
import { assertAdmin } from "@/lib/api-auth";
import { Booking } from "@/models/Booking";

const schema = z.object({
  propertyId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  guestName: z.string().optional(),
  revenue: z.number().min(0).optional(),
  channel: z.enum(["direct", "airbnb", "booking.com", "other"]).optional(),
  status: z.enum(["confirmed", "pending", "cancelled"]).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; bookingId: string }> }
) {
  const { user, response } = await assertAdmin();
  if (response || !user) return response!;

  const { id, bookingId } = await context.params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid booking data." }, { status: 400 });
  }

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startDate) update.startDate = new Date(parsed.data.startDate);
  if (parsed.data.endDate) update.endDate = new Date(parsed.data.endDate);

  const booking = await Booking.findOneAndUpdate(
    { _id: bookingId, investorId: id },
    update,
    { new: true }
  ).lean();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  return NextResponse.json({
    booking: {
      id: String(booking._id),
      propertyId: String(booking.propertyId),
      startDate: booking.startDate,
      endDate: booking.endDate,
      guestName: booking.guestName,
      revenue: booking.revenue,
      channel: booking.channel,
      status: booking.status,
    },
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; bookingId: string }> }
) {
  const { user, response } = await assertAdmin();
  if (response || !user) return response!;

  const { id, bookingId } = await context.params;
  const booking = await Booking.findOneAndDelete({
    _id: bookingId,
    investorId: id,
  });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
