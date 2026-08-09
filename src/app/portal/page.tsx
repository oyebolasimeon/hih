import Link from "next/link";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Investor } from "@/models/Investor";
import { Property } from "@/models/Property";
import { Booking } from "@/models/Booking";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import { formatGBP } from "@/lib/format";

export default async function PortalDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  await connectDB();
  const investor = await Investor.findById(session.user.id).lean();
  if (!investor) {
    return (
      <EmptyState
        title="Profile not ready"
        description="Your investor profile could not be found. Please contact support."
      />
    );
  }

  const [propertyCount, bookings] = await Promise.all([
    Property.countDocuments({ investorId: session.user.id }),
    Booking.find({
      investorId: session.user.id,
      status: { $ne: "cancelled" },
    })
      .select("revenue startDate")
      .lean(),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const periodRevenue = bookings
    .filter((b) => {
      const start = new Date(b.startDate);
      return start >= monthStart && start <= monthEnd;
    })
    .reduce((sum, b) => sum + (b.revenue || 0), 0);

  const empty = propertyCount === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">
          Live portfolio summary for {investor.name}.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total invested" value={formatGBP(investor.totalInvested)} />
        <StatCard label="Total returns" value={formatGBP(investor.totalReturns)} />
        <StatCard label="Rental income (this month)" value={formatGBP(periodRevenue)} />
        <StatCard label="Properties" value={String(propertyCount)} />
      </div>

      {empty ? (
        <EmptyState
          title="No properties yet"
          description="Your portfolio is being prepared. Once our team adds properties, they will appear here automatically."
        />
      ) : (
        <div className="app-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Portfolio value</h2>
              <p className="text-sm text-muted mt-1">
                Current reported value across your holdings.
              </p>
            </div>
            <p className="text-2xl font-semibold">{formatGBP(investor.portfolioValue)}</p>
          </div>
          <div className="mt-4">
            <Link href="/portal/properties" className="text-sm font-medium text-brand-dark hover:underline">
              View properties →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
