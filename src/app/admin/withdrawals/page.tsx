import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import AdminWithdrawalsClient from "@/components/admin/AdminWithdrawalsClient";

export default async function AdminWithdrawalsPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) redirect("/portal");
  if (!hasPermission(session.user.permissions, "users:read")) {
    redirect("/admin");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-semibold">
          Withdrawals & payouts
        </h1>
        <p className="mt-1 text-sm text-muted">
          Choose Paystack or manual bank transfer, complete pending payouts, and
          review disputes.
        </p>
      </div>
      <AdminWithdrawalsClient />
    </div>
  );
}
