import type { Metadata } from "next";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { SessionProvider } from "@/context/SessionContext";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),

  title: {
    default: "Hoot-Hoot",
    template: "%s | Hoot-Hoot",
  },

  description: "Train your brain. Improve your logic. Master cognitive challenges.",
  keywords: ["games", "aptitude", "cognitive", "challenges", "hoot-hoot"],

  alternates: {
    canonical: siteConfig.url,
  },

  openGraph: {
    title: "Cognitive Games",
    description: "Play cognitive aptitude games and practice brain challenges.",
    url: siteConfig.url,
    siteName: "Cognitive Games",
    locale: siteConfig.locale,
    type: "website",
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preload" as="font" type="font/ttf" href="/fonts/Parkinsans-VariableFont_wght.ttf" crossOrigin="anonymous" />
        <link rel="preload" as="font" type="font/ttf" href="/fonts/SpaceGrotesk-VariableFont_wght.ttf" crossOrigin="anonymous" />
      </head>
      <body className="relative" suppressHydrationWarning>
        <SessionProvider>
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
