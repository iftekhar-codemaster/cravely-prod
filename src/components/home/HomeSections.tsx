"use client";

import OfferCarousel from "./OfferCarousel";
import Reveal from "./Reveal";
import FoodGrid from "@/components/FoodGrid";
import type { Offer, Food } from "@/lib/data";
import { cuisineImages } from "@/lib/mock-data";
import { useMemo } from "react";

export function HomeOffers({ offers }: { offers: Offer[] }) {
  return (
    <section className="px-4 pt-6">
      <Reveal>
        <h2 className="text-xl font-extrabold mb-4">
          <i className="fa-solid fa-location-dot text-primary mr-2" aria-hidden />
          Thakurgaon&apos;s Offers
        </h2>
      </Reveal>
      <Reveal delay={80}>
        <OfferCarousel offers={offers} />
      </Reveal>
    </section>
  );
}

export function HomeCuisines({ cuisines }: { cuisines: string[] }) {
  return (
    <section className="px-4 pt-8">
      <Reveal>
        <h2 className="text-xl font-extrabold mb-5">Your Cuisines</h2>
      </Reveal>
      <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
        {cuisines.map((cuisine, i) => (
          <a
            key={cuisine}
            href={`/search?q=${encodeURIComponent(cuisine)}`}
            className={`anim-pop min-w-[100px] text-center pressable hover:-translate-y-1 transition-transform`}
            style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                cuisineImages[cuisine] ??
                `https://loremflickr.com/120/120/dish?lock=${i + 400}`
              }
              alt={cuisine}
              loading="lazy"
              className="w-[84px] h-[84px] rounded-[20px] object-cover mx-auto mb-2 shadow-card"
            />
            <p className="text-[15px] font-semibold text-primary">{cuisine}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

export function HomeFoods({ foods }: { foods: Food[] }) {
  const sorted = useMemo(
    () =>
      foods.slice().sort((a, b) => b.rating * Math.log10(1 + b.reviews) - a.rating * Math.log10(1 + a.reviews)),
    [foods],
  );

  return (
    <section className="px-4 pt-8">
      <div className="flex items-center justify-between mb-4">
        <Reveal>
          <h2 className="text-xl font-extrabold">All Foods</h2>
        </Reveal>
        <a
          href="/packages"
          className="anim-pop bg-primary text-white text-sm px-4 py-2 rounded-full font-semibold pressable shadow-[0_4px_10px_rgba(255,71,87,0.25)]"
        >
          Make your Plan
        </a>
      </div>
      <FoodGrid foods={sorted} />
    </section>
  );
}
