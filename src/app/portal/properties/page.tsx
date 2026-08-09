import Link from "next/link";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Property } from "@/models/Property";
import PropertiesListClient from "@/components/portal/PropertiesListClient";
import { serializeProperty } from "@/lib/property-fields";

export default async function PropertiesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  await connectDB();
  const properties = await Property.find({
    investorId: session.user.id,
    ownerType: { $ne: "company" },
  })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-semibold">
            My properties
          </h1>
          <p className="mt-1 text-sm text-muted max-w-2xl">
            Holdings Nova Elite assigned to you outright. Nova can also manage
            lettings for you — lease, rent, or Airbnb — and you track those
            returns here. Browse Opportunities for open investment listings.
          </p>
        </div>
        <Link
          href="/portal/opportunities"
          className="app-btn app-btn-secondary shrink-0"
        >
          Browse opportunities
        </Link>
      </div>

      <PropertiesListClient properties={properties.map(serializeProperty)} />
    </div>
  );
}
