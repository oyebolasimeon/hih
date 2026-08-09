import { auth } from "@/lib/auth";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import PortalShell from "@/components/portal/PortalShell";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <ThemeProvider initialTheme={session?.user?.theme || "light"}>
      <PortalShell>{children}</PortalShell>
    </ThemeProvider>
  );
}
