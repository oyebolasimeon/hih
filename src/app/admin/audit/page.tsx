import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import AuditLogClient from "@/components/audit/AuditLogClient";
import { PageHeaderSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default async function AdminAuditPage() {
  const session = await auth();
  if (!hasPermission(session?.user?.permissions, "audit:read")) {
    redirect("/admin");
  }
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <PageHeaderSkeleton />
          <TableSkeleton rows={8} cols={4} />
        </div>
      }
    >
      <AuditLogClient
        title="Audit log"
        subtitle="Full trail of admin and investor write actions and auth events — who initiated each change, with old and new values."
      />
    </Suspense>
  );
}
