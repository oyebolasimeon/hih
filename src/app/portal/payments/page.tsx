import { Suspense } from "react";
import PaymentsClient from "@/components/portal/PaymentsClient";
import { TableSkeleton } from "@/components/ui/Skeleton";

export default function PortalPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Payments
        </h1>
        <p className="mt-1 text-sm text-muted">
          View rent payments, deposits, and payout history.
        </p>
      </div>
      <Suspense fallback={<TableSkeleton rows={4} />}>
        <PaymentsClient />
      </Suspense>
    </div>
  );
}
