"use client";

import { useEffect, useState } from "react";
import { getOffers, getCuisines, getAllFoods } from "@/lib/data";
import OfferCarousel from "./OfferCarousel";
import Reveal from "./Reveal";
import FoodGrid from "@/components/FoodGrid";
import type { Offer } from "@/lib/data";
import { useMemo } from "react";

export function HomeOffers() {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => void getOffers().then(setOffers), 0);
    return () => clearTimeout(t);
  }, []);
  if (!offers) {
    return (
      <div className="px-4 pt-6">
        <div className="h-6 w-48 rounded skel mb-4" />
        <div className="h-[150px] rounded-xl skel" />
        <div className="flex justify-center mt-3"><div className="w-24 h-1.5 rounded-full skel" /></div>
      </div>
    );
  }
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

export function HomeCuisines() {
  const [cuisines, setCuisines] = useState<string[] | null>(null);
  useEffect(() => {
    const t = setTimeout(() => void getCuisines().then(setCuisines), 0);
    return () => clearTimeout(t);
  }, []);

  if (!cuisines) {
    return (
      <div className="px-4 pt-8">
        <div className="h-6 w-36 rounded skel mb-5" />
        <div className="flex gap-6 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="min-w-[84px] flex flex-col items-center gap-2">
              <div className="w-[84px] h-[84px] rounded-[20px] skel" />
              <div className="w-14 h-3 rounded skel" />
            </div>
          ))}
        </div>
      </div>
    );
  }

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
              src={`https://loremflickr.com/120/120/dish?lock=${i + 400}`}
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

export function HomeFoods() {
  const [foods, setFoods] = useState<Awaited<ReturnType<typeof getAllFoods>> | null>(
    null,
  );
  useEffect(() => {
    const t = setTimeout(() => void getAllFoods().then(setFoods), 0);
    return () => clearTimeout(t);
  }, []);
  const sorted = useMemo(
    () =>
      (foods ?? []).slice().sort((a, b) => b.rating * Math.log10(1 + b.reviews) - a.rating * Math.log10(1 + a.reviews)),
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

      {!foods ? (
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-line overflow-hidden bg-card">
              <div className="h-32 skel" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-3/4 rounded skel" />
                <div className="h-3 w-1/3 rounded skel" />
                <div className="h-4 w-1/4 rounded skel" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <FoodGrid foods={sorted} />
      )}
    </section>
  );
}
