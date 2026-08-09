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
  const properties = await Property.find({ investorId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-semibold">Properties</h1>
        <p className="mt-1 text-sm text-muted">Your holdings managed by Nova Elite Homes.</p>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          title="No properties yet"
          description="When properties are assigned to your portfolio, they will show up here with photos, status, and valuations."
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
                  <span className="text-xs uppercase tracking-wide text-muted">{p.status}</span>
                </div>
                <p className="mt-1 text-sm text-muted line-clamp-2">{p.address}</p>
                <p className="mt-3 text-sm font-medium">{formatGBP(p.currentValue)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
