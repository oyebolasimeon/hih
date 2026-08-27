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
  title: "House In Hand | Housing you can trust",
  description:
    "Find, rent, and manage homes across Nigeria — verified listings, digital agreements, and rent tools for tenants, landlords, students, and estate managers.",
  keywords:
    "House In Hand, property rental Nigeria, student hostels, landlords, estate management, rent payments, verified housing",
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: "/favicon.png",
  },
};

const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem('hih-theme');
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.dataset.theme = 'dark';
      document.documentElement.style.colorScheme = 'dark';
    } else if (t === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.dataset.theme = 'light';
      document.documentElement.style.colorScheme = 'light';
    }
  } catch (e) {}
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
      className={`${jetbrainsMono.variable} h-full antialiased`}
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
