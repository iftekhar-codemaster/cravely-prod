"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getLiked, getPackage, addToPackage, toggleLiked } from "@/lib/store";

type Item = {
  href?: string;
  icon: string;
  label: string;
  onClick?: () => void;
  active?: boolean;
  tone?: "primary" | "muted";
};

export default function BottomNav() {
  const pathname = usePathname();
  const productId = pathname.startsWith("/product/")
    ? decodeURIComponent(pathname.slice("/product/".length))
    : null;

  const [liked, setLiked] = useState(false);
  const [inPack, setInPack] = useState(false);

  // Sync contextual toggles with the store (also updates when FavButton used)
  useEffect(() => {
    if (!productId) return;
    const sync = () => {
      setLiked(getLiked().includes(productId));
      setInPack(getPackage().includes(productId));
    };
    const t = setTimeout(sync, 0);
    window.addEventListener("cravely:store", sync);
    return () => {
      clearTimeout(t);
      window.removeEventListener("cravely:store", sync);
    };
  }, [productId]);

  function toggleLike() {
    if (!productId) return;
    setLiked(toggleLiked(productId));
  }
  function togglePack() {
    if (!productId) return;
    setInPack(addToPackage(productId));
  }

  const items: Item[] = [
    { href: "/", icon: "fa-solid fa-house", label: "Home", active: pathname === "/" },
    {
      href: "/maps",
      icon: "fa-solid fa-map-location-dot",
      label: "Maps",
      active: pathname.startsWith("/maps"),
    },
    productId
      ? {
          // Morphed slot: like THIS dish
          icon: liked ? "fa-solid fa-heart" : "fa-regular fa-heart",
          label: liked ? "Saved" : "Like",
          onClick: toggleLike,
          active: liked,
          tone: liked ? "primary" : "muted",
        }
      : {
          href: "/liked",
          icon: "fa-solid fa-heart",
          label: "Liked",
          active: pathname.startsWith("/liked"),
        },
    productId
      ? {
          // Morphed slot: package THIS dish
          icon: inPack ? "fa-solid fa-circle-check" : "fa-solid fa-circle-plus",
          label: inPack ? "Added" : "Package",
          onClick: togglePack,
          active: inPack,
          tone: inPack ? "primary" : "muted",
        }
      : {
          href: "/packages",
          icon: "fa-solid fa-box-open",
          label: "Packages",
          active: pathname.startsWith("/packages"),
        },
    {
      href: "/restaurants",
      icon: "fa-solid fa-store",
      label: "Restaurants",
      active: pathname.startsWith("/restaurants") && !productId,
    },
    {
      href: "/profile",
      icon: `${pathname.startsWith("/profile") ? "fa-solid" : "fa-regular"} fa-user`,
      label: "Profile",
      active: pathname.startsWith("/profile"),
    },
  ];

  return (
    <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2.5rem)] max-w-[calc(28rem-2.5rem)]
        bg-white rounded-[30px] px-3 py-3 flex justify-between items-center
        shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-black/5"
      aria-label="Primary"
    >
      {items.map((item, idx) => {
        const cls = `flex flex-col items-center gap-1 text-[11px] font-medium w-[16%] transition-colors ${
          item.tone === "primary" || item.active
            ? "text-primary font-semibold"
            : "text-[#a4b0be]"
        }`;
        // key by icon+label so morphs replay the pop animation
        const inner = (
          <>
            <i key={item.icon} className={`${item.icon} text-lg anim-pop`} aria-hidden />
            <span key={item.label}>{item.label}</span>
          </>
        );
        if (item.onClick) {
          return (
            <button key={`${item.label}-${idx}`} onClick={item.onClick} className={cls}>
              {inner}
            </button>
          );
        }
        return (
          <Link
            key={item.href}
            href={item.href!}
            className={cls}
            aria-current={item.active ? "page" : undefined}
          >
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}
