import { NextResponse } from "next/server";
import { assertInvestor } from "@/lib/api-auth";
import { Property } from "@/models/Property";
import { Booking } from "@/models/Booking";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  const { id } = await context.params;
  const property = await Property.findOne({
    _id: id,
    investorId: user.id,
  }).lean();

  if (!property) {
    return NextResponse.json({ error: "Property not found." }, { status: 404 });
  }

  const bookings = await Booking.find({
    investorId: user.id,
    propertyId: id,
  })
    .sort({ startDate: -1 })
    .lean();

  return NextResponse.json({
    property: {
      id: String(property._id),
      name: property.name,
      address: property.address,
      imageUrls: property.imageUrls,
      status: property.status,
      purchasePrice: property.purchasePrice,
      currentValue: property.currentValue,
    },
    bookings: bookings.map((b) => ({
      id: String(b._id),
      startDate: b.startDate,
      endDate: b.endDate,
      guestName: b.guestName,
      revenue: b.revenue,
      channel: b.channel,
      status: b.status,
    })),
  });
}
