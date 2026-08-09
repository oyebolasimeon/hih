import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Property } from "@/models/Property";
import { Booking } from "@/models/Booking";
import CalendarClient from "@/components/portal/CalendarClient";

export default async function PortalCalendarPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  await connectDB();
  const [properties, bookings] = await Promise.all([
    Property.find({ investorId: session.user.id }).lean(),
    Booking.find({ investorId: session.user.id }).sort({ startDate: 1 }).lean(),
  ]);

  const propertyMap = new Map(properties.map((p) => [String(p._id), p.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold">Calendar</h1>
        <p className="mt-1 text-sm text-muted">
          Bookings across all of your properties. Filter by property as needed.
        </p>
      </div>
      <CalendarClient
        properties={properties.map((p) => ({
          id: String(p._id),
          name: p.name,
        }))}
        bookings={bookings.map((b) => ({
          id: String(b._id),
          propertyId: String(b.propertyId),
          propertyName: propertyMap.get(String(b.propertyId)) || "Property",
          startDate: new Date(b.startDate).toISOString(),
          endDate: new Date(b.endDate).toISOString(),
          guestName: b.guestName,
          revenue: b.revenue,
          channel: b.channel,
          status: b.status,
        }))}
      />
    </div>
  );
}
