import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import SiteContentAdminClient from "@/components/admin/SiteContentAdminClient";

export default async function AdminSiteContentPage() {
  const session = await auth();
  if (!hasPermission(session?.user?.permissions, "content:read")) {
    redirect("/admin");
  }
  return <SiteContentAdminClient />;
}
