import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import AdminKycClient from "@/components/admin/AdminKycClient";

export default async function AdminKycPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/portal");
  if (!hasPermission(session.user.permissions, "kyc:read")) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          KYC Review
        </h1>
        <p className="mt-1 text-sm text-muted max-w-2xl">
          Prembly auto-verifies NIN/BVN/CAC with face match. Approve or reject
          cases that still need Ops review (e.g. student ID).
        </p>
      </div>
      <AdminKycClient />
    </div>
  );
}
