import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Analytics } from "@/models/Analytics";
import AnalyticsClient from "@/components/portal/AnalyticsClient";

export default async function PortalAnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  await connectDB();
  const rows = await Analytics.find({ investorId: session.user.id })
    .sort({ period: -1 })
    .lean();

  const periods = rows.map((a) => ({
    id: String(a._id),
    period: a.period,
    revenue: a.revenue,
    commission: a.commission,
    occupancyRate: a.occupancyRate,
    channelBreakdown:
      a.channelBreakdown instanceof Map
        ? Object.fromEntries(a.channelBreakdown)
        : ((a.channelBreakdown || {}) as Record<string, number>),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">Analytics</h1>
        <p className="mt-1 text-sm text-muted">
          Monthly performance Nova recorded while managing your portfolio —
          revenue, commission, occupancy, and channels (Airbnb, Booking.com, and
          more).
        </p>
      </div>
      <AnalyticsClient periods={periods} />
    </div>
  );
}
