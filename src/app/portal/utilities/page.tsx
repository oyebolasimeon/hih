import { Suspense } from "react";
import UtilitiesClient from "@/components/portal/UtilitiesClient";
import { TableSkeleton } from "@/components/ui/Skeleton";

export default function PortalUtilitiesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Utilities
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Pay electricity, cable TV, data, airtime, education, and insurance in
          one place — secure checkout included.
        </p>
      </div>
      <Suspense fallback={<TableSkeleton rows={4} />}>
        <UtilitiesClient />
      </Suspense>
    </div>
  );
}
