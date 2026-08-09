import { AuthBackgroundProvider } from "@/components/auth/AuthBackgroundContext";
import { getAuthBackgroundContent } from "@/lib/site-content";

export default async function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bg = await getAuthBackgroundContent();

  return (
    <AuthBackgroundProvider backgroundUrl={bg.imageUrl}>
      {children}
    </AuthBackgroundProvider>
  );
}
