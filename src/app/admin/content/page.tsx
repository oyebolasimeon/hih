import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import InvestorModalContentClient from "@/components/admin/InvestorModalContentClient";

export default async function AdminLoginModalContentPage() {
  const session = await auth();
  if (!hasPermission(session?.user?.permissions, "content:read")) {
    redirect("/admin");
  }
  return <InvestorModalContentClient />;
}
