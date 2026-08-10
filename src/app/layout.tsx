import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import AuthProvider from "@/components/providers/AuthProvider";
import { BrandingProvider } from "@/components/providers/BrandingProvider";
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Never block the shell on Mongo — BrandingProvider hydrates from /api/public/branding.
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <BrandingProvider initial={DEFAULT_BRANDING}>
          <AuthProvider>{children}</AuthProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
