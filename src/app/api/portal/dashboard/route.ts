import { NextResponse } from "next/server";
import { assertInvestor } from "@/lib/api-auth";
import { Investor } from "@/models/Investor";
import { Property } from "@/models/Property";
import { Booking } from "@/models/Booking";

export async function GET() {
  const { user, response } = await assertInvestor();
  if (response || !user) return response!;

  const investor = await Investor.findById(user.id).lean();
  if (!investor) {
    return NextResponse.json({ error: "Investor profile not found." }, { status: 404 });
  }

  const [propertyCount, bookings] = await Promise.all([
    Property.countDocuments({ investorId: user.id }),
    Booking.find({
      investorId: user.id,
      status: { $ne: "cancelled" },
    })
      .select("revenue startDate endDate")
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

  return NextResponse.json({
    investor: {
      id: String(investor._id),
      name: investor.name,
      email: investor.email,
      totalInvested: investor.totalInvested,
      totalReturns: investor.totalReturns,
      portfolioValue: investor.portfolioValue,
      propertyCount,
      periodRevenue,
    },
  });
}
