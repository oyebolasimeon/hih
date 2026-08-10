import { AuthBackgroundProvider } from "@/components/auth/AuthBackgroundContext";
import { getBranding } from "@/lib/branding";

export default async function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const branding = await getBranding().catch(() => null);
  const bg = branding?.authBackgroundUrl || "/hero-home.jpg";

  return (
    <AuthBackgroundProvider backgroundUrl={bg}>
      {children}
    </AuthBackgroundProvider>
  );
}
