"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAllFoods } from "@/lib/data";
import type { Food } from "@/lib/data";
import FoodCard from "@/components/FoodCard";
import { getLiked } from "@/lib/store";

export default function LikedPage() {
  const [allFoods, setAllFoods] = useState<Food[] | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>([]);

  useEffect(() => {
    getAllFoods().then(setAllFoods);
    const sync = () => setLikedIds(getLiked());
    sync();
    window.addEventListener("cravely:store", sync);
    return () => window.removeEventListener("cravely:store", sync);
  }, []);

  if (!allFoods) {
    return (
      <div className="px-4 pt-6">
        <h1 className="text-xl font-semibold mb-5">
          <i className="fa-solid fa-heart text-primary mr-2" aria-hidden />
          Liked
        </h1>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const likedFoods = allFoods.filter((f) => likedIds.includes(f.id));

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-semibold mb-5">
        <i className="fa-solid fa-heart text-primary mr-2" aria-hidden />
        Liked
      </h1>
      {likedFoods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-text-light">
          No liked dishes yet. Tap the{" "}
          <i className="fa-solid fa-heart text-primary" aria-hidden /> on any dish.
          <div className="mt-3">
            <Link href="/" className="text-primary font-semibold">
              Browse foods
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {likedFoods.map((food) => (
            <FoodCard key={food.id} food={food} />
          ))}
        </div>
      )}
    </div>
  );
}
