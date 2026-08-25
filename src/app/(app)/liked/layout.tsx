import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Liked dishes",
  robots: { index: false },
};

export default function LikedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
