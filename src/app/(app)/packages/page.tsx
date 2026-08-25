"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getAllFoods,
  getAllRestaurants,
  buildPackages,
  type Food,
  type PackageResult,
  type Restaurant,
} from "@/lib/data";
import { getPackage, addToPackage } from "@/lib/store";
import SmartImg from "@/components/SmartImg";

export default function PackageBuilder() {
  const [allFoods, setAllFoods] = useState<Food[] | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState(5);
  const [results, setResults] = useState<PackageResult[] | null>(null);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    getAllFoods().then(setAllFoods);
    getAllRestaurants().then(setAllRestaurants);
    const sync = () => setSelected(getPackage());
    const t = setTimeout(sync, 0);
    window.addEventListener("cravely:store", sync);
    return () => {
      clearTimeout(t);
      window.removeEventListener("cravely:store", sync);
    };
  }, []);

  const foodById = useMemo(() => {
    const map = new Map<string, Food>();
    (allFoods ?? []).forEach((f) => map.set(f.id, f));
    return map;
  }, [allFoods]);

  const restaurantNames = useMemo(() => {
    const m = new Map<string, string>();
    allRestaurants.forEach((r) => m.set(r.id, r.name));
    return m;
  }, [allRestaurants]);

  const selectedFoods = useMemo(
    () => selected.map((id) => foodById.get(id)).filter((f): f is Food => Boolean(f)),
    [selected, foodById],
  );
  const bundleTotal = selectedFoods.reduce((s, f) => s + f.price, 0);

  function remove(id: string) {
    addToPackage(id); // toggles off since it's in the package
    setSelected((s) => s.filter((x) => x !== id));
    setResults(null);
  }

  async function compare() {
    setComparing(true);
    try {
      setResults(await buildPackages(selected, radiusKm));
    } finally {
      setComparing(false);
    }
  }

  if (!allFoods) {
    return (
      <div className="px-4 pt-6 space-y-4">
        <div className="h-7 w-52 rounded skel" />
        <div className="h-20 rounded-2xl skel" />
        {[0, 1].map((i) => (
          <div key={i} className="h-16 rounded-xl skel" />
        ))}
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <header className="px-4 pt-6 anim-fade-up">
        <h1 className="text-xl font-extrabold">
          <i className="fa-solid fa-box-open text-primary mr-2" aria-hidden />
          Package Builder
        </h1>
        <p className="text-xs text-text-light mt-1 max-w-[280px] leading-relaxed">
          Bundle the dishes you want — we&apos;ll price the whole package at every
          kitchen near you.
        </p>
      </header>

      {/* Bundle summary card */}
      <section className="px-4 mt-5 anim-fade-up" style={{ animationDelay: "80ms" }}>
        <div className="rounded-2xl bg-gray-900 text-white p-5 shadow-lg relative overflow-hidden">
          <i
            className="fa-solid fa-bowl-food absolute -right-3 -bottom-3 text-[72px] opacity-10 rotate-12"
            aria-hidden
          />
          <p className="text-[11px] uppercase tracking-widest text-white/60">
            Your bundle
          </p>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-3xl font-extrabold">{selectedFoods.length}</span>
            <span className="text-sm text-white/70 mb-1">
              dish{selectedFoods.length === 1 ? "" : "es"}
            </span>
            {selectedFoods.length > 0 && (
              <>
                <span className="ml-auto mb-1 text-sm text-white/70">≈</span>
                <span className="text-2xl font-extrabold text-[#ffb3ba] mb-0.5">
                  ৳{bundleTotal}
                </span>
              </>
            )}
          </div>
          {selectedFoods.length === 0 && (
            <p className="text-xs text-white/60 mt-2 leading-relaxed">
              Empty for now — add dishes below or tap{" "}
              <Link href="/" className="underline">
                Home
              </Link>
              .
            </p>
          )}
        </div>
      </section>

      {/* Bundle items */}
      {selectedFoods.length > 0 && (
        <section className="px-4 mt-4 anim-fade-up" style={{ animationDelay: "140ms" }}>
          <ul className="space-y-2">
            {selectedFoods.map((food, i) => (
              <li
                key={food.id}
                className="anim-fade-up flex items-center gap-3 rounded-xl border border-line bg-card p-2.5"
                style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
              >
                <SmartImg
                  src={food.image}
                  alt=""
                  className="w-11 h-11 rounded-lg bg-gray-100 flex-shrink-0"
                  imgClassName="w-full h-full object-cover"
                />
                <Link
                  href={`/product/${food.id}`}
                  className="flex-1 min-w-0 text-sm font-semibold truncate hover:text-primary"
                >
                  {food.name}
                  <span className="block text-[11px] text-text-light font-normal truncate">
                    {restaurantNames.get(food.restaurantId) ?? ""}
                  </span>
                </Link>
                <span className="font-bold text-sm">৳{food.price}</span>
                <button
                  onClick={() => remove(food.id)}
                  aria-label={`Remove ${food.name}`}
                  className="w-7 h-7 rounded-full bg-background text-text-light hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <i className="fa-solid fa-xmark text-xs" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Radius + compare */}
      <section className="px-4 mt-6 anim-fade-up" style={{ animationDelay: "200ms" }}>
        <div className={`rounded-2xl border p-5 ${selectedFoods.length ? "border-line bg-card shadow-card" : "border-dashed border-line opacity-60"}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-bold text-sm">Search radius</span>
            <span className="bg-primary/10 text-primary font-extrabold text-sm rounded-full px-3 py-1">
              {radiusKm} km
            </span>
          </div>
          <input
            id="radius"
            type="range"
            min={1}
            max={10}
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            disabled={selectedFoods.length === 0}
            className="w-full accent-primary"
            aria-label="Search radius in kilometers"
          />
          <div className="flex justify-between text-[10px] text-text-light mt-1 px-0.5">
            {[1, 3, 5, 7, 10].map((k) => (
              <span key={k}>{k}</span>
            ))}
          </div>
          <button
            onClick={() => void compare()}
            disabled={selectedFoods.length === 0 || comparing}
            className="mt-4 w-full bg-primary text-white py-3 rounded-full font-semibold pressable transition-shadow enabled:hover:shadow-[0_6px_18px_rgba(255,71,87,0.35)] disabled:opacity-40"
          >
            {comparing ? (
              <>
                <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
                Checking kitchens…
              </>
            ) : (
              <>
                <i className="fa-solid fa-wand-magic-sparkles mr-2" aria-hidden />
                Compare package prices
              </>
            )}
          </button>
        </div>
      </section>

      {/* Results */}
      {comparing && (
        <section className="px-4 mt-5 space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 rounded-xl skel" />
          ))}
        </section>
      )}

      {!comparing && results && results.length > 0 && (
        <section className="px-4 mt-6">
          <h2 className="font-bold text-sm mb-3">
            Within {radiusKm} km ·{" "}
            <span className="text-text-light font-normal">{results.length} match{results.length === 1 ? "" : "es"}</span>
          </h2>
          <div className="space-y-3 pb-24">
            {results.map((result, i) => {
              const missing = selected.length - result.items.length;
              const cheapest = results[0];
              const saving = cheapest.total - result.total;
              return (
                <div
                  key={result.restaurant.id}
                  className={`anim-fade-up rounded-2xl border overflow-hidden ${
                    i === 0 ? "border-primary shadow-[0_6px_18px_rgba(255,71,87,0.15)]" : "border-line bg-card shadow-card"
                  }`}
                  style={{ animationDelay: `${Math.min(i * 60, 300)}ms` }}
                >
                  <div className={`px-4 py-2 flex items-center gap-2 ${i === 0 ? "bg-primary text-white" : "bg-background"}`}>
                    {i === 0 ? (
                      <>
                        <i className="fa-solid fa-crown text-xs" aria-hidden />
                        <span className="text-xs font-bold uppercase tracking-wide">
                          Best deal
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-text-light">
                        #{i + 1}
                      </span>
                    )}
                    {saving > 0 && i !== 0 && (
                      <span className="ml-auto text-[11px] text-red-500 font-bold">
                        +৳{saving} vs best
                      </span>
                    )}
                    {i === 0 && (
                      <span className="ml-auto text-[11px] font-bold">
                        you save ৳{Math.max(0, -saving)}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/restaurants/${result.restaurant.id}`}
                          className="font-bold text-sm truncate hover:text-primary"
                        >
                          {result.restaurant.name}
                          {result.restaurant.verified && (
                            <i className="fa-solid fa-circle-check text-primary text-xs ml-1.5" title="Verified" aria-label="Verified" />
                          )}
                        </Link>
                        <p className="text-xs text-text-light mt-0.5">
                          {result.restaurant.distanceKm} km · ⭐ {result.restaurant.rating}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-extrabold text-xl ${i === 0 ? "text-primary" : ""}`}>
                          ৳{result.total}
                        </div>
                        {missing > 0 && (
                          <div className="text-[10px] text-text-light">
                            similar swap ×{missing}
                          </div>
                        )}
                      </div>
                    </div>

                    <ul className="mt-3 space-y-1 border-t border-line pt-3">
                      {result.items.map((item) => (
                        <li key={item.food.id} className="flex justify-between text-xs">
                          <span className="truncate">{item.food.name}</span>
                          <span className="text-text-light ml-2 flex-shrink-0">৳{item.price}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!comparing && results && results.length === 0 && (
        <div className="px-4 mt-6">
          <div className="rounded-2xl border border-dashed border-line p-8 text-center anim-pop">
            <i className="fa-solid fa-store-slash text-3xl text-text-light mb-3" aria-hidden />
            <p className="text-sm text-text-light">
              No kitchen within {radiusKm} km offers this full bundle.
              <br />
              Try widening the radius.
            </p>
          </div>
        </div>
      )}

      {/* Quick add */}
      <section className="px-4 pb-24">
        <h2 className="font-bold text-sm mt-8 mb-3">
          Quick add
          <span className="text-text-light font-normal"> — popular right now</span>
        </h2>
        <div className="flex gap-2 flex-wrap">
          {allFoods.slice(0, 10).map((food) => {
            const on = selected.includes(food.id);
            return (
              <button
                key={food.id}
                onClick={() => {
                  addToPackage(food.id);
                  setSelected((s) =>
                    on ? s.filter((x) => x !== food.id) : [...s, food.id],
                  );
                  setResults(null);
                }}
                className={`pressable text-xs px-3 py-2 rounded-full border transition-colors ${
                  on
                    ? "bg-primary text-white border-primary font-semibold"
                    : "bg-card text-text-light border-line"
                }`}
              >
                <i className={`fa-${on ? "solid fa-check" : "regular fa-plus"} mr-1.5`} aria-hidden />
                {food.name}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
