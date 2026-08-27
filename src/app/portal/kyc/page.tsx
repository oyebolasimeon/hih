import { Suspense } from "react";
import KycClient from "@/components/portal/KycClient";
import { FormSkeleton } from "@/components/ui/Skeleton";

export default function PortalKycPage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <KycClient />
    </Suspense>
  );
}
