import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import AuthedRedirect from "@/components/marketing/AuthedRedirect";
import InstallNowButton from "@/components/marketing/InstallNowButton";
import { LANDING_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cravely",
  alternates: { canonical: LANDING_URL },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <AuthedRedirect />
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-line">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2">
            <Image
              src="/icon-192.png"
              alt="Cravely logo"
              width={32}
              height={32}
              className="rounded-lg"
              priority
            />
            <span className="text-lg font-extrabold leading-none">
              <span className="text-primary">Crave</span>ly
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/privacy"
              className="text-text-light hover:text-foreground transition-colors hidden sm:inline"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-text-light hover:text-foreground transition-colors hidden sm:inline"
            >
              Terms
            </Link>
            <InstallNowButton />
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-background">
        <div className="max-w-5xl mx-auto px-5 py-10 text-sm text-text-light flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image
              src="/icon-192.png"
              alt=""
              width={24}
              height={24}
              className="rounded-md"
            />
            <span>
              © {new Date().getFullYear()} Cravely — Thakurgaon
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
