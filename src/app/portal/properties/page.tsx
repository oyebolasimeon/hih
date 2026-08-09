import Link from "next/link";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Property } from "@/models/Property";
import EmptyState from "@/components/ui/EmptyState";
import { formatGBP } from "@/lib/format";

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
        <Link href="/portal/opportunities" className="app-btn app-btn-secondary shrink-0">
          Browse opportunities
        </Link>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No assigned properties yet"
          description="When Nova assigns a property to your portfolio (outright purchase / onboarding), it will appear here. Meanwhile you can review open investment opportunities."
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map((p) => (
            <Link
              key={String(p._id)}
              href={`/portal/properties/${p._id}`}
              className="app-card overflow-hidden hover:border-brand/40 transition-colors"
            >
              <div className="aspect-[16/10] bg-surface-dark">
                {p.imageUrls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrls[0]}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-sm text-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold">{p.name}</h2>
                  <span className="text-[10px] uppercase tracking-wide rounded bg-brand-subtle px-1.5 py-0.5 text-foreground">
                    {p.acquisitionType === "nova_investment"
                      ? "Via investment"
                      : "Nova outright"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted line-clamp-2">{p.address}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{formatGBP(p.currentValue)}</p>
                  <span className="text-xs uppercase tracking-wide text-muted">
                    {p.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
