"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: "fa-solid fa-house", label: "Home" },
  { href: "/maps", icon: "fa-solid fa-map-location-dot", label: "Maps" },
  { href: "/liked", icon: "fa-solid fa-heart", label: "Liked" },
  { href: "/packages", icon: "fa-solid fa-box-open", label: "Packages" },
  { href: "/restaurants", icon: "fa-solid fa-store", label: "Restaurants" },
  { href: "/profile", icon: "fa-regular fa-user", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Product pages have their own bottom action bar (pre order / package / close)
  if (pathname.startsWith("/product/")) return null;

  return (
    <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2.5rem)] max-w-[calc(28rem-2.5rem)]
        bg-white rounded-[30px] px-3 py-3 flex justify-between items-center
        shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-black/5"
      aria-label="Primary"
    >
      {items.map((item) => {
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors w-[16%] ${
              active ? "text-primary font-semibold" : "text-[#a4b0be]"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <i className={`${item.icon} text-lg`} aria-hidden />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
