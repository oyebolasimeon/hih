import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import AuthProvider from "@/components/providers/AuthProvider";
import { BrandingProvider } from "@/components/providers/BrandingProvider";
import { MutationProvider } from "@/components/providers/MutationProvider";
import { DEFAULT_BRANDING } from "@/lib/branding-defaults";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "House In Hands | Housing you can trust",
  description:
    "Property. In Your Hands. Find it. Rent it. Manage it. Grow it. — a trusted digital ecosystem connecting people, properties, payments, services and property intelligence across Nigeria.",
  keywords:
    "House In Hands, HIH, property technology Nigeria, property management, rent payments, verified housing, landlords, tenants",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem('hih-theme');
    var theme = t === 'light' ? 'light' : 'dark';
    document.documentElement.classList.add(theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (e) {
    document.documentElement.classList.add('dark');
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} dark h-full antialiased`}
      data-theme="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <Script id="hih-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <BrandingProvider initial={DEFAULT_BRANDING}>
          <AuthProvider>
            <MutationProvider>{children}</MutationProvider>
          </AuthProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
