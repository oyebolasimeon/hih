import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Property } from "@/models/Property";
import { Booking } from "@/models/Booking";
import EmptyState from "@/components/ui/EmptyState";
import { ImageGallery } from "@/components/ui/ImageViewer";
import { formatDate, formatGBP } from "@/lib/format";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const { id } = await params;
  await connectDB();

  const property = await Property.findOne({
    _id: id,
    investorId: session.user.id,
    ownerType: { $ne: "company" },
  }).lean();

  if (!property) notFound();

  const bookings = await Booking.find({
    investorId: session.user.id,
    propertyId: id,
  })
    .sort({ startDate: -1 })
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/portal/properties" className="text-sm text-muted hover:text-foreground">
          ← Properties
        </Link>
        <h1 className="mt-2 text-2xl sm:text-3xl font-display font-semibold">{property.name}</h1>
        <p className="mt-1 text-sm text-muted">{property.address}</p>
        <p className="mt-2 text-sm text-muted max-w-2xl">
          Managed by Nova Elite Homes — lettings, short stays, and guest
          operations can run through us. Revenue below is what Nova recorded for
          this property.
        </p>
      </div>

      {property.imageUrls?.length ? (
        <ImageGallery images={property.imageUrls} title={property.name} />
      ) : null}

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="app-card p-4">
          <p className="text-xs text-muted uppercase tracking-wider">Status</p>
          <p className="mt-1 font-semibold capitalize">{property.status}</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs text-muted uppercase tracking-wider">Purchase price</p>
          <p className="mt-1 font-semibold">{formatGBP(property.purchasePrice)}</p>
        </div>
        <div className="app-card p-4">
          <p className="text-xs text-muted uppercase tracking-wider">Current value</p>
          <p className="mt-1 font-semibold">{formatGBP(property.currentValue)}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Nova-managed stays & returns</h2>
        {bookings.length === 0 ? (
          <EmptyState
            title="No managed stays yet"
            description="When Nova operates this property (lease, rent, or Airbnb-style stays), bookings and revenue will appear here."
          />
        ) : (
          <div className="app-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Dates</th>
                  <th className="px-4 py-3 font-medium">Guest</th>
                  <th className="px-4 py-3 font-medium">Channel</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={String(b._id)} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      {formatDate(b.startDate)} – {formatDate(b.endDate)}
                    </td>
                    <td className="px-4 py-3">{b.guestName || "—"}</td>
                    <td className="px-4 py-3 capitalize">{b.channel}</td>
                    <td className="px-4 py-3 capitalize">{b.status}</td>
                    <td className="px-4 py-3">{formatGBP(b.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
