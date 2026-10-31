import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import AuthProvider from "@/components/providers/AuthProvider";
import { BrandingProvider } from "@/components/providers/BrandingProvider";
import { MutationProvider } from "@/components/providers/MutationProvider";
import { DEFAULT_BRANDING } from "@/lib/branding-defaults";
import AnnouncementModal from "@/components/AnnouncementModal";
import {
  OrganizationJsonLd,
  WebsiteJsonLd,
} from "@/components/seo/JsonLd";
import { rootMetadata } from "@/lib/seo/metadata";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  ...rootMetadata(),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4E9D8" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1F3A" },
  ],
  width: "device-width",
  initialScale: 1,
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
      lang="en-NG"
      className={`${inter.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
      data-theme="dark"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Explicit for Google Search Console crawlers */}
        <meta
          name="google-site-verification"
          content="YFCW36GXJfbIq3ujQMa7ELWGPz2KtQsVHO1K4Qpn8AI"
        />
        <Script id="hih-theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <OrganizationJsonLd />
        <WebsiteJsonLd />
      </head>
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <BrandingProvider initial={DEFAULT_BRANDING}>
          <AuthProvider>
            <MutationProvider>
              {children}
              <AnnouncementModal />
            </MutationProvider>
          </AuthProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
