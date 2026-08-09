import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import TeamClient from "@/components/admin/TeamClient";
import { hasPermission } from "@/lib/rbac";

export default async function AdminTeamPage() {
  const session = await auth();
  if (!hasPermission(session?.user?.permissions, "admins:manage")) {
    redirect("/admin");
  }
  return <TeamClient />;
}
