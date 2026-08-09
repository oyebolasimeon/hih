import Link from "next/link";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Investor } from "@/models/Investor";
import { Property } from "@/models/Property";
import EmptyState from "@/components/ui/EmptyState";
import { formatGBP } from "@/lib/format";
import InvestorSearch from "@/components/admin/InvestorSearch";
import { hasPermission } from "@/lib/rbac";

export default async function AdminInvestorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const session = await auth();
  const canWrite = hasPermission(
    session?.user?.permissions,
    "investors:write"
  );
  await connectDB();

  const filter = q.trim()
    ? {
        $or: [
          { name: { $regex: q.trim(), $options: "i" } },
          { email: { $regex: q.trim(), $options: "i" } },
        ],
      }
    : {};

  const investors = await Investor.find(filter).sort({ createdAt: -1 }).lean();
  const counts = await Property.aggregate([
    {
      $match: {
        investorId: { $ne: null },
        ownerType: { $ne: "company" },
      },
    },
    { $group: { _id: "$investorId", count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count as number]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">Investors</h1>
          <p className="mt-1 text-sm text-muted">
            Manage investor profiles, properties, bookings, and analytics.
          </p>
        </div>
        {canWrite ? (
          <Link href="/admin/investors/new" className="app-btn app-btn-primary">
            Find / onboard
          </Link>
        ) : null}
      </div>

      <InvestorSearch initialQuery={q} />

      {investors.length === 0 ? (
        <EmptyState
          title="No investors found"
          description="Investors appear here after they register. Use Find / onboard to locate a signup by email."
        />
      ) : (
        <div className="app-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Portfolio</th>
                <th className="px-4 py-3 font-medium">Properties</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {investors.map((inv) => (
                <tr key={String(inv._id)} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{inv.name}</td>
                  <td className="px-4 py-3 text-muted">{inv.email}</td>
                  <td className="px-4 py-3">{formatGBP(inv.portfolioValue)}</td>
                  <td className="px-4 py-3">{countMap.get(String(inv._id)) || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/investors/${inv._id}`}
                      className="text-brand-dark font-medium hover:underline"
                    >
                      {canWrite ? "Manage" : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
