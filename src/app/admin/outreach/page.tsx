import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import OutreachEmailClient from "@/components/admin/OutreachEmailClient";

export default async function AdminOutreachPage() {
  const session = await auth();
  if (!hasPermission(session?.user?.permissions, "content:read")) {
    redirect("/admin");
  }
  return <OutreachEmailClient />;
}
