import { auth } from "@/lib/auth";
import DashboardClient from "@/components/portal/DashboardClient";

export default async function PortalDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return (
    <DashboardClient
      name={session.user.name || "there"}
    />
  );
}
