import type { Metadata } from "next";
import { APP_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Package builder",
  description:
    "Mix dishes from different Thakurgaon kitchens into one package and compare totals instantly.",
  alternates: { canonical: `${APP_URL}/packages` },
};

export default function PackagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
