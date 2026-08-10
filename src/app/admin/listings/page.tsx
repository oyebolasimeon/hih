import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import AdminListingsClient from "@/components/admin/AdminListingsClient";

export default async function AdminListingsPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/portal");
  if (!hasPermission(session.user.permissions, "listings:read")) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Listing verification
        </h1>
        <p className="mt-1 text-sm text-muted">
          Verify property listings before they appear as trusted in search.
        </p>
      </div>
      <AdminListingsClient />
    </div>
  );
}
