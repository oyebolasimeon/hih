import { Suspense } from "react";
import AuditLogClient from "@/components/audit/AuditLogClient";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function PortalActivityPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeaderSkeleton />
          <TableSkeleton rows={6} cols={3} />
        </div>
      }
    >
      <AuditLogClient
        title="Activity"
        subtitle="Your actions and changes Nova made to your portfolio — who initiated them, with old and new values."
        apiPath="/api/portal/audit"
        showAdminFilters={false}
      />
    </Suspense>
  );
}
