import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Investor } from "@/models/Investor";
import { Property } from "@/models/Property";
import EmptyState from "@/components/ui/EmptyState";
import DashboardClient from "@/components/portal/DashboardClient";

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

  const properties = await Property.find({
    investorId: session.user.id,
    ownerType: { $ne: "company" },
  })
    .select("monthlyRent")
    .lean();

  const monthlyRentTotal = properties.reduce(
    (sum, p) => sum + (p.monthlyRent || 0),
    0
  );

  return (
    <DashboardClient
      name={investor.name}
      totalInvested={investor.totalInvested}
      totalReturns={investor.totalReturns}
      portfolioValue={investor.portfolioValue}
      propertyCount={properties.length}
      monthlyRentTotal={monthlyRentTotal}
      empty={properties.length === 0}
    />
  );
}
