import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import EmailSignatureAdminClient from "@/components/admin/EmailSignatureAdminClient";
import EmailTemplatesClient from "@/components/admin/EmailTemplatesClient";

export default async function AdminEmailTemplatesPage() {
  const session = await auth();
  if (!hasPermission(session?.user?.permissions, "content:read")) {
    redirect("/admin");
  }
  return (
    <div className="space-y-8">
      <EmailSignatureAdminClient />
      <EmailTemplatesClient />
    </div>
  );
}
