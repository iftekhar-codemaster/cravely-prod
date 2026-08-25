import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://app.cravely.space"),
  title: {
    default: "Cravely — Find what you crave",
    template: "%s · Cravely",
  },
  description:
    "Discover nearby restaurants, dishes, prices and ratings. Build packages and compare prices across restaurants near you.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cravely",
  },
  openGraph: {
    title: "Cravely — Find what you crave",
    description:
      "Discover nearby restaurants, dishes, prices and ratings. Build packages and compare prices across restaurants near you.",
    siteName: "Cravely",
    images: [{ url: "/og-banner.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Cravely — Find what you crave",
    description:
      "Discover nearby restaurants, dishes, prices and ratings. Build packages and compare prices across restaurants near you.",
    images: ["/og-banner.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ff4757",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
