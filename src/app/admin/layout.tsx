import { auth } from "@/lib/auth";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import AdminShell from "@/components/admin/AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <ThemeProvider initialTheme={session?.user?.theme || "light"}>
      <AdminShell>{children}</AdminShell>
    </ThemeProvider>
  );
}
