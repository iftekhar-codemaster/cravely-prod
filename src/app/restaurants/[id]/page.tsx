"use client";

import { useParams } from "next/navigation";
import CloseButton from "@/components/CloseButton";
import SmartImg from "@/components/SmartImg";
import FoodCard from "@/components/FoodCard";
import { useAsyncData } from "@/lib/useAsyncData";
import {
  getRestaurant,
  getFoodsByRestaurant,
} from "@/lib/data";
import type { Food, Restaurant } from "@/lib/data";

/** Tolerant time parser: accepts "18:30" (24h) or "6:30 PM" style. Returns minutes since midnight, or undefined. */
function parseTime(value?: string): number | undefined {
  if (!value) return undefined;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return undefined;
  let h = Number.parseInt(m[1], 10);
  const min = Number.parseInt(m[2], 10);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  if (h > 23 || min > 59) return undefined;
  return h * 60 + min;
}

/** Returns true/false when both times parse, otherwise undefined (unknown). */
function isOpenNow(openFrom?: string, openUntil?: string): boolean | undefined {
  const from = parseTime(openFrom);
  const until = parseTime(openUntil);
  if (from === undefined || until === undefined) return undefined;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  if (until <= from) return cur >= from || cur < until; // spans midnight
  return cur >= from && cur < until;
}

export default function RestaurantDetailPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);

  const { data: restaurant, loading } = useAsyncData<Restaurant | undefined>(
    () => getRestaurant(id),
    [id],
  );
  const { data: menu } = useAsyncData<Food[]>(
    () => getFoodsByRestaurant(id),
    [id],
  );

  if (loading || !restaurant) {
    return (
      <div>
        <CloseButton />
        {/* Hero skeleton */}
        <div className="h-48 skel" />
        <div className="p-5 space-y-3">
          <div className="h-7 w-2/3 rounded skel" />
          <div className="h-4 w-1/2 rounded skel" />
          <div className="flex gap-4 mt-2">
            <div className="h-4 w-16 rounded skel" />
            <div className="h-4 w-24 rounded skel" />
            <div className="h-4 w-16 rounded skel" />
          </div>
        </div>
        {/* Menu skeleton */}
        <div className="px-5 pt-2">
          <div className="h-5 w-24 rounded skel mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-line overflow-hidden bg-card">
                <div className="h-32 skel" />
                <div className="p-3 space-y-2">
                  <div className="h-4 w-3/4 rounded skel" />
                  <div className="h-3 w-1/3 rounded skel" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative pb-6">
      <CloseButton />

      {/* Hero */}
      <div className="relative h-48 bg-gray-200 anim-fade-up">
        <SmartImg
          src={restaurant.image}
          alt={restaurant.name}
          eager
          className="w-full h-full"
          imgClassName="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <h1 className="text-2xl font-extrabold drop-shadow-lg flex items-center gap-2">
            {restaurant.name}
            {restaurant.verified && (
              <i
                className="fa-solid fa-circle-check text-primary text-base"
                title="Verified"
                aria-label="Verified"
              />
            )}
          </h1>
        </div>
      </div>

      {restaurant.cover && (
        <div className="px-5 pt-4 anim-fade-up">
          <SmartImg
            src={restaurant.cover}
            alt={`${restaurant.name} cover`}
            className="h-28 rounded-xl overflow-hidden w-full"
            imgClassName="w-full h-full object-cover"
          />
        </div>
      )}

      <section
        className="p-5 border-b border-line anim-fade-up"
        style={{ animationDelay: "70ms" }}
      >
        <p className="text-sm text-text-light">
          {restaurant.cuisine} · {restaurant.address}
        </p>
        {restaurant.description && (
          <p className="text-sm text-text-light mt-2">{restaurant.description}</p>
        )}
        <div className="flex gap-4 mt-3 text-sm flex-wrap items-center">
          <span className="text-[#ffa502] font-semibold">
            <i className="fa-solid fa-star mr-1" aria-hidden />
            {restaurant.rating}
          </span>
          <span className="text-text-light">({restaurant.reviews}+ reviews)</span>
          <span className="text-text-light">
            <i className="fa-solid fa-location-dot mr-1" aria-hidden />
            {restaurant.distanceKm} km
          </span>
          <span className="text-text-light">Open until {restaurant.openUntil}</span>
          {isOpenNow(restaurant.openFrom, restaurant.openUntil) === true && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-card border border-line px-2 py-0.5 text-xs font-semibold text-green-600">
              <i className="fa-solid fa-circle text-[6px]" aria-hidden />
              Open now
            </span>
          )}
          {isOpenNow(restaurant.openFrom, restaurant.openUntil) === false && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-card border border-line px-2 py-0.5 text-xs font-semibold text-red-500">
              <i className="fa-solid fa-circle text-[6px]" aria-hidden />
              Closed
            </span>
          )}
        </div>
        {(restaurant.phone || restaurant.whatsapp) && (
          <div className="flex gap-2 mt-4">
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="pressable inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-primary"
              >
                <i className="fa-solid fa-phone text-[11px]" aria-hidden />
                Call
              </a>
            )}
            {restaurant.whatsapp && (
              <a
                href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pressable inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-primary"
              >
                <i className="fa-brands fa-whatsapp text-[11px]" aria-hidden />
                WhatsApp
              </a>
            )}
          </div>
        )}
      </section>

      {/* Menu */}
      <section className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Menu</h2>
          {menu && <span className="text-xs text-text-light">{menu.length} items</span>}
        </div>
        {!menu ? (
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 rounded-xl skel" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {menu.map((food) => (
              <FoodCard key={food.id} food={food} />
            ))}
          </div>
        )}
        {menu && menu.length === 0 && (
          <p className="text-sm text-text-light py-6 text-center">
            Menu coming soon.
          </p>
        )}
      </section>
    </div>
  );
}
