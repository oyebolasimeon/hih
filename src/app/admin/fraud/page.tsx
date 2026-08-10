import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import AdminFraudClient from "@/components/admin/AdminFraudClient";

export default async function AdminFraudPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/portal");
  if (!hasPermission(session.user.permissions, "fraud:read")) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Fraud reports
        </h1>
        <p className="mt-1 text-sm text-muted">
          Review reports submitted by users about listings, payments, or
          profiles.
        </p>
      </div>
      <AdminFraudClient />
    </div>
  );
}
