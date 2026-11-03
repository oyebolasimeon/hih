import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import AdminExitNoticesClient from "@/components/admin/AdminExitNoticesClient";

export default async function AdminExitNoticesPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/portal");
  if (!hasPermission(session.user.permissions, "legal:read")) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Exit notices & legal
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Review AI-screened exit / vacate notices against the tenancy
          agreement, serve the legal PDF to the tenant, complete termination,
          and decide remaining-rent refunds for early exits.
        </p>
      </div>
      <AdminExitNoticesClient />
    </div>
  );
}
