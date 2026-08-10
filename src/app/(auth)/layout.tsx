import { AuthBackgroundProvider } from "@/components/auth/AuthBackgroundContext";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Avoid Mongo on the auth shell — BrandingProvider / AuthCard supply live assets.
  return (
    <AuthBackgroundProvider backgroundUrl="/hero-home.jpg">
      {children}
    </AuthBackgroundProvider>
  );
}
