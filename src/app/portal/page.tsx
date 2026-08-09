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
    Property.countDocuments({
      investorId: session.user.id,
      ownerType: { $ne: "company" },
    }),
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
          Capital and performance Nova reports for {investor.name}. After you buy,
          Nova can manage lease, rent, or Airbnb operations — returns show in
          Analytics, Calendar, and each property. Open Opportunities for new
          listings.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total invested" value={formatGBP(investor.totalInvested)} />
        <StatCard label="Total returns" value={formatGBP(investor.totalReturns)} />
        <StatCard label="Rental income (this month)" value={formatGBP(periodRevenue)} />
        <StatCard label="Properties" value={String(propertyCount)} />
      </div>

      {empty ? (
        <div className="space-y-4">
          <EmptyState
            title="No Nova properties in your portfolio yet"
            description="Nova Elite assigns holdings to you after onboarding, or you can express interest on open Opportunities. Investors cannot create properties themselves."
          />
          <div className="flex flex-wrap gap-2">
            <Link href="/portal/opportunities" className="app-btn app-btn-primary text-sm">
              Browse opportunities
            </Link>
            <Link href="/portal/properties" className="app-btn app-btn-secondary text-sm">
              My properties
            </Link>
          </div>
        </div>
      ) : (
        <div className="app-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Portfolio value</h2>
              <p className="text-sm text-muted mt-1">
                Current reported value across holdings Nova assigned to you.
              </p>
            </div>
            <p className="text-2xl font-semibold">{formatGBP(investor.portfolioValue)}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/portal/properties" className="text-sm font-medium text-brand-dark hover:underline">
              View my properties →
            </Link>
            <Link href="/portal/opportunities" className="text-sm font-medium text-brand-dark hover:underline">
              Browse opportunities →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
