"use client";

import { useEffect, useRef, useState } from "react";
import type { Food } from "@/lib/data";
import FoodCard from "./FoodCard";

const BATCH = 8;

export default function FoodGrid({ foods }: { foods: Food[] }) {
  const [foodsKey, setFoodsKey] = useState(foods);
  const [count, setCount] = useState(BATCH);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  // reset pagination when the foods list identity changes (render-time state
  // update for a prop-derived value — no effect needed)
  if (foods !== foodsKey) {
    setFoodsKey(foods);
    setCount(BATCH);
  }

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || loading || count >= foods.length) return;
        setLoading(true);
        setTimeout(() => {
          setCount((c) => Math.min(c + BATCH, foods.length));
          setLoading(false);
        }, 400);
      },
      { threshold: 0.1 },
    );
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [foods, count, loading]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] md:gap-6">
        {foods.slice(0, count).map((food) => (
          <FoodCard key={food.id} food={food} />
        ))}
      </div>
      {loading && (
        <div className="text-center py-7 text-primary">
          <i className="fa-solid fa-circle-notch fa-spin fa-2x" aria-hidden />
        </div>
      )}
      {count < foods.length && <div ref={triggerRef} className="h-12" />}
      {foods.length === 0 && (
        <p className="text-text-light text-sm text-center py-8">
          No dishes found. Try another search.
        </p>
      )}
    </>
  );
}
