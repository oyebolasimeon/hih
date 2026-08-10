import { Suspense } from "react";
import KycClient from "@/components/portal/KycClient";
import { FormSkeleton } from "@/components/ui/Skeleton";

export default function PortalKycPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Identity verification
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          We verify your identity with Prembly — NIN and selfie for everyone, BVN
          for landlords, CAC for estate managers. Student IDs are reviewed by our
          Ops team after Prembly checks pass.
        </p>
      </div>
      <Suspense fallback={<FormSkeleton />}>
        <KycClient />
      </Suspense>
    </div>
  );
}
