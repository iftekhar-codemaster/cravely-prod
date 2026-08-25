"use client";

import { useMemo, useState } from "react";
import type { Restaurant } from "@/lib/data";
import RestaurantCard from "@/components/RestaurantCard";

const sortOptions = [
  { key: "distance", label: "Nearest" },
  { key: "rating", label: "Top rated" },
  { key: "reviews", label: "Most reviewed" },
] as const;

type SortKey = (typeof sortOptions)[number]["key"];

export default function RestaurantList({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  const [sort, setSort] = useState<SortKey>("distance");
  const [maxKm, setMaxKm] = useState(10);

  const list = useMemo(() => {
    return [...restaurants]
      .filter((r) => r.distanceKm <= maxKm)
      .sort((a, b) =>
        sort === "distance"
          ? a.distanceKm - b.distanceKm
          : sort === "rating"
            ? b.rating - a.rating
            : b.reviews - a.reviews,
      );
  }, [restaurants, sort, maxKm]);

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-semibold mb-4">
        <i className="fa-solid fa-store text-primary mr-2" aria-hidden />
        Restaurants nearby
      </h1>

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSort(opt.key)}
            aria-pressed={sort === opt.key}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              sort === opt.key
                ? "bg-primary text-white border-primary"
                : "bg-card text-text-light border-line"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-3 text-xs text-text-light mb-5">
        Within {maxKm} km
        <input
          type="range"
          min={1}
          max={10}
          value={maxKm}
          onChange={(e) => setMaxKm(Number(e.target.value))}
          className="flex-1 accent-primary"
        />
      </label>

      <div className="space-y-3 pb-4">
        {list.map((r) => (
          <RestaurantCard key={r.id} restaurant={r} />
        ))}
        {list.length === 0 && (
          <p className="text-sm text-text-light text-center py-8">
            No restaurants within {maxKm} km.
          </p>
        )}
      </div>
    </div>
  );
}
