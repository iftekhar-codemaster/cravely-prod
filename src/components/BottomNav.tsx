"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getLiked, getPackage, addToPackage, toggleLiked } from "@/lib/store";
import { getFood, getRestaurant } from "@/lib/data";

const RETURN_KEY = "cravely:returnTo";

/** Remember the last non-product page so the product Close button can go back. */
export function trackReturnTo(pathname: string): void {
  if (typeof window === "undefined") return;
  if (pathname.startsWith("/product/") || pathname.startsWith("/login")) return;
  window.sessionStorage.setItem(RETURN_KEY, pathname);
}

type Slot = {
  key: string;
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const productId = pathname.startsWith("/product/")
    ? decodeURIComponent(pathname.slice("/product/".length))
    : null;
  const inStudio = pathname.startsWith("/console/restaurant");
  const [studioTab, setStudioTab] = useState<
    "listing" | "add" | "menu" | "settings"
  >("listing");

  // studio tab comes from ?tab= (read from location to avoid useSearchParams
  // suspense requirements inside the layout)
  useEffect(() => {
    if (!inStudio) return;
    const read = () => {
      const t = new URLSearchParams(window.location.search).get("tab");
      setStudioTab(
        t === "add" || t === "menu" || t === "settings" ? t : "listing",
      );
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, [inStudio, pathname]);

  const [liked, setLiked] = useState(false);
  const [inPack, setInPack] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderTarget, setOrderTarget] = useState<{
    name: string;
    phone?: string;
    whatsapp?: string;
    foodName: string;
  } | null>(null);

  // remember where the user came from
  useEffect(() => {
    trackReturnTo(pathname);
  }, [pathname]);

  // sync contextual toggles with the store
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

  // resolve the dish's restaurant contact info for the order sheet
  useEffect(() => {
    if (!productId) return;
    let alive = true;
    void (async () => {
      const food = await getFood(productId);
      if (!food || !alive) return;
      const restaurant = await getRestaurant(food.restaurantId);
      if (!restaurant || !alive) return;
      setOrderTarget({
        name: restaurant.name,
        phone: restaurant.phone,
        whatsapp: restaurant.whatsapp,
        foodName: food.name,
      });
    })();
    return () => {
      alive = false;
    };
  }, [productId]);

  const toggleLike = useCallback(() => {
    if (!productId) return;
    setLiked(toggleLiked(productId));
  }, [productId]);

  const togglePack = useCallback(() => {
    if (!productId) return;
    setInPack(addToPackage(productId));
  }, [productId]);

  function closeProduct() {
    const returnTo = window.sessionStorage.getItem(RETURN_KEY);
    if (returnTo) router.push(returnTo);
    else router.back();
  }

  // ---- Slot layouts ----
  const normalSlots: Slot[] = [
    { key: "home", icon: "fa-solid fa-house", label: "Home", href: "/", active: pathname === "/" },
    { key: "maps", icon: "fa-solid fa-map-location-dot", label: "Maps", href: "/maps", active: pathname.startsWith("/maps") },
    { key: "liked", icon: "fa-solid fa-heart", label: "Liked", href: "/liked", active: pathname.startsWith("/liked") },
    { key: "packages", icon: "fa-solid fa-box-open", label: "Packages", href: "/packages", active: pathname.startsWith("/packages") },
    { key: "restaurants", icon: "fa-solid fa-store", label: "Restaurants", href: "/restaurants", active: pathname.startsWith("/restaurants") },
    { key: "profile", icon: `${pathname.startsWith("/profile") ? "fa-solid" : "fa-regular"} fa-user`, label: "Profile", href: "/profile", active: pathname.startsWith("/profile") },
  ];

  const productSlots: Slot[] = [
    { key: "home", icon: "fa-solid fa-house", label: "Home", href: "/" },
    {
      key: "order",
      icon: "fa-solid fa-bag-shopping",
      label: "Order",
      onClick: () => setOrderOpen(true),
    },
    {
      key: "eatlater",
      icon: liked ? "fa-solid fa-heart" : "fa-regular fa-heart",
      label: "Eat later",
      onClick: toggleLike,
      active: liked,
    },
    {
      key: "package",
      icon: inPack ? "fa-solid fa-circle-check" : "fa-solid fa-circle-plus",
      label: inPack ? "Added" : "Add to plan",
      onClick: togglePack,
      active: inPack,
    },
    {
      key: "close",
      icon: "fa-solid fa-xmark",
      label: "Close",
      onClick: closeProduct,
    },
  ];

  const studioSlots: Slot[] = [
    {
      key: "home",
      icon: "fa-solid fa-house",
      label: "Home",
      href: "/",
    },
    {
      key: "listing",
      icon: studioTab === "listing" ? "fa-solid fa-store" : "fa-regular fa-store",
      label: "Listing",
      href: "/console/restaurant?tab=listing",
      active: studioTab === "listing",
    },
    {
      key: "add",
      icon: "fa-solid fa-circle-plus",
      label: "Add",
      href: "/console/restaurant?tab=add",
      active: studioTab === "add",
    },
    {
      key: "menu",
      icon: studioTab === "menu" ? "fa-solid fa-book-open" : "fa-regular fa-book-open",
      label: "Menu",
      href: "/console/restaurant?tab=menu",
      active: studioTab === "menu",
    },
    {
      key: "settings",
      icon: studioTab === "settings" ? "fa-solid fa-gear" : "fa-regular fa-gear",
      label: "Settings",
      href: "/console/restaurant?tab=settings",
      active: studioTab === "settings",
    },
  ];

  const slots = inStudio ? studioSlots : productId ? productSlots : normalSlots;
  const mode = inStudio ? "studio" : productId ? "product" : "normal";

  return (
    <>
      {orderOpen && orderTarget && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center"
          onClick={() => setOrderOpen(false)}
        >
          <div
            className="anim-fade-up w-full max-w-md bg-white rounded-t-3xl p-6 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-line mx-auto mb-4" />
            <h2 className="text-lg font-extrabold">
              Order from {orderTarget.name}
            </h2>
            <p className="text-sm text-text-light mt-1">
              {orderTarget.foodName} — order direct, no middleman.
            </p>
            <div className="mt-5 space-y-2.5">
              {orderTarget.phone && (
                <a
                  href={`tel:${orderTarget.phone}`}
                  className="pressable flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 font-semibold text-sm"
                >
                  <i className="fa-solid fa-phone text-primary" aria-hidden />
                  Call {orderTarget.name}
                </a>
              )}
              {orderTarget.whatsapp && (
                <a
                  href={`https://wa.me/${orderTarget.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi! I'd like to order ${orderTarget.foodName} from Cravely.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pressable flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 font-semibold text-sm"
                >
                  <i className="fa-brands fa-whatsapp text-green-600" aria-hidden />
                  WhatsApp {orderTarget.name}
                </a>
              )}
              {!orderTarget.phone && !orderTarget.whatsapp && (
                <p className="text-sm text-text-light">
                  {orderTarget.name} hasn&apos;t added order contact details yet.
                </p>
              )}
            </div>
            <button
              onClick={() => setOrderOpen(false)}
              className="mt-5 w-full text-center text-xs text-text-light hover:text-primary transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <nav
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2.5rem)] max-w-[calc(28rem-2.5rem)]
        bg-white rounded-[30px] px-3 py-3 flex justify-between items-center
        shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-black/5"
      aria-label="Primary"
    >
      {slots.map((slot, i) => {
        const cls = `flex flex-col items-center gap-1 text-[11px] font-medium ${
          slot.key === "close"
            ? "text-red-500 font-semibold"
            : slot.active
              ? "text-primary font-semibold"
              : "text-[#a4b0be]"
        } ${
          slot.key === "close"
            ? "w-[14%]"
            : inStudio
              ? "w-[19%]"
              : "w-[16%]"
        }`;
        // keyed by mode+key so swaps replay the pop animation with stagger
        const inner = (
          <>
            <i
              key={`${mode}-${slot.key}-${slot.icon}`}
              className={`${slot.icon} text-lg anim-pop`}
              style={{ animationDelay: `${i * 40}ms` }}
              aria-hidden
            />
            <span key={`${mode}-${slot.key}-${slot.label}`}>{slot.label}</span>
          </>
        );
        if (slot.onClick) {
          return (
            <button key={`${mode}-${slot.key}`} onClick={slot.onClick} className={cls}>
              {inner}
            </button>
          );
        }
        return (
          <Link
            key={`${mode}-${slot.key}`}
            href={slot.href!}
            className={cls}
            aria-current={slot.active ? "page" : undefined}
          >
            {inner}
          </Link>
        );
      })}
      </nav>
    </>
  );
}
