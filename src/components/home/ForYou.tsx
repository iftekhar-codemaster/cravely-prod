"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Food, Restaurant } from "@/lib/data";
import { recommendDishes } from "@/lib/recommend";
import { collectSignals, isGeoOptedIn, setGeoOptedIn } from "@/lib/track";
import { getLiked } from "@/lib/store";

export default function ForYou({
  foods,
  restaurants,
}: {
  foods: Food[];
  restaurants: Restaurant[];
}) {
  const [recs, setRecs] = useState<ReturnType<typeof recommendDishes> | null>(null);
  const [geo, setGeo] = useState(false);
  const [tick, setTick] = useState(0); // recompute when signals change

  useEffect(() => {
    const t = setTimeout(() => {
      setGeo(isGeoOptedIn());
      const signals = collectSignals(getLiked());
      setRecs(
        recommendDishes({
          foods,
          restaurants,
          loved: signals.loved,
          views: signals.views,
          geoOptIn: signals.geo,
        }),
      );
    }, 0);
    return () => clearTimeout(t);
  }, [tick, foods, restaurants]);

  async function enableLocation() {
    setGeoOptedin_safe(true);
    setGeo(true);
    setTick((v) => v + 1);
  }

  function setGeoOptedin_safe(v: boolean) {
    // wrapped so a denied permission still records the attempt-free fallback
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => setGeoOptedIn(true),
          () => setGeoOptedIn(true), // even on deny, boost nearby using known area
          { timeout: 4000 },
        );
      } else {
        setGeoOptedIn(v);
      }
    } catch {
      setGeoOptedIn(v);
    }
  }

  if (!recs) {
    return (
      <section className="px-4 pt-8">
        <div className="h-6 w-40 rounded skel mb-1" />
        <div className="h-4 w-56 rounded skel mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {[0, 1].map((i) => (
            <div key={i} className="min-w-[240px] h-28 rounded-xl skel" />
          ))}
        </div>
      </section>
    );
  }

  if (recs.length === 0) return null;

  return (
    <section className="px-4 pt-8">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xl font-extrabold">
          <i className="fa-solid fa-wand-magic-sparkles text-primary mr-2 text-sm" aria-hidden />
          For You
        </h2>
        {!geo && (
          <button
            onClick={() => void enableLocation()}
            className="text-[11px] font-semibold text-primary border border-primary/30 rounded-full px-2.5 py-1 pressable"
          >
            <i className="fa-solid fa-location-dot mr-1" aria-hidden />
            Nearby
          </button>
        )}
      </div>
      <p className="text-xs text-text-light mb-4">
        Tuned to what you love, view and crave.
      </p>

      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
        {recs.slice(0, 8).map((rec, i) => (
          <Link
            key={rec.food.id}
            href={`/product/${rec.food.id}`}
            className="anim-fade-up min-w-[220px] rounded-xl border border-line bg-card shadow-card p-3 pressable hover:-translate-y-0.5 transition-transform"
            style={{ animationDelay: `${Math.min(i * 60, 420)}ms` }}
          >
            <div className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={rec.food.image}
                alt=""
                loading="lazy"
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{rec.food.name}</div>
                <div className="text-xs text-[#ffa502] mt-0.5">
                  <i className="fa-solid fa-star mr-1" aria-hidden />
                  {rec.food.rating}
                  <span className="text-text-light ml-2">৳{rec.food.price}</span>
                </div>
              </div>
            </div>
            {rec.reasons.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {rec.reasons.map((reason) => (
                  <span
                    key={reason}
                    className="text-[10px] bg-primary/8 text-primary font-semibold px-2 py-0.5 rounded-full"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
