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
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Landlords can upload full property details, but listings are never
          auto-approved. House In Hands AI reviews each upload; if it is not
          satisfied the case is escalated here with email alerts. Approve only
          when you are ready for marketplace visibility.
        </p>
      </div>
      <AdminListingsClient />
    </div>
  );
}
