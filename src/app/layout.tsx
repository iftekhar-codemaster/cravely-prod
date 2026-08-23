import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import ImpersonationBanner from "@/components/ImpersonationBanner";
import { AuthProvider } from "@/components/AuthProvider";
import AppGate from "@/components/AppGate";

export const metadata: Metadata = {
  title: "Cravely — Find what you crave",
  description:
    "Discover nearby restaurants, dishes, prices and ratings. Build packages and compare prices across restaurants near you.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cravely",
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
        <body className="min-h-full flex flex-col">
          <AuthProvider>
            <AppGate>
              <ImpersonationBanner />
              <main className="w-full max-w-md mx-auto bg-white min-h-screen shadow-2xl relative pb-32">
                {children}
              </main>
              <BottomNav />
            </AppGate>
          </AuthProvider>
        </body>
    </html>
  );
}
