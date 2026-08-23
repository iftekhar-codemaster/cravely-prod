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

export default function PackageBuilder() {
  const [allFoods, setAllFoods] = useState<Food[] | null>(null);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState(5);
  const [results, setResults] = useState<PackageResult[]>([]);
  const [comparing, setComparing] = useState(false);

  // Load catalog + persisted bundle
  useEffect(() => {
    getAllFoods().then(setAllFoods);
    getAllRestaurants().then(setAllRestaurants);
    const sync = () => setSelected(getPackage());
    // deferred so we don't call setState synchronously inside the effect
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
    const map = new Map<string, string>();
    allRestaurants.forEach((r) => map.set(r.id, r.name));
    return map;
  }, [allRestaurants]);

  const selectedFoods = useMemo(
    () =>
      selected
        .map((id) => foodById.get(id))
        .filter((f): f is Food => Boolean(f)),
    [selected, foodById],
  );

  const cheapest = results[0];

  function remove(id: string) {
    addToPackage(id); // toggles off since it's in the package
    setSelected((s) => s.filter((x) => x !== id));
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
      <div className="px-4 pt-6">
        <h1 className="text-xl font-semibold mb-1">
          <i className="fa-solid fa-box-open text-primary mr-2" aria-hidden />
          Package Builder
        </h1>
        <div className="space-y-3 mt-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-semibold mb-1">
        <i className="fa-solid fa-box-open text-primary mr-2" aria-hidden />
        Package Builder
      </h1>
      <p className="text-sm text-text-light mb-5">
        Bundle dishes and compare package prices across restaurants near you.
      </p>

      {/* Selected bundle */}
      <section className="mb-6">
        <h2 className="font-bold mb-3">Your bundle ({selectedFoods.length})</h2>
        {selectedFoods.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-5 text-center text-sm text-text-light">
            Nothing here yet. Add dishes from{" "}
            <Link href="/" className="text-primary font-semibold">
              Home
            </Link>{" "}
            or any product page (“Add to package”).
          </div>
        ) : (
          <div className="space-y-3">
            {selectedFoods.map((food) => (
              <div
                key={food.id}
                className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-card border border-line"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={food.image}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/product/${food.id}`}
                    className="font-semibold text-sm truncate block hover:text-primary"
                  >
                    {food.name}
                  </Link>
                  <p className="text-xs text-text-light truncate">
                    {restaurantNames.get(food.restaurantId) ?? ""}
                  </p>
                </div>
                <span className="font-bold text-sm">৳{food.price}</span>
                <button
                  onClick={() => remove(food.id)}
                  aria-label={`Remove ${food.name}`}
                  className="w-7 h-7 rounded-full bg-background text-text-light hover:text-primary transition-colors"
                >
                  <i className="fa-solid fa-xmark" aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Radius input + compare */}
      <section className="mb-6">
        <label className="block font-bold mb-2" htmlFor="radius">
          Search radius: {radiusKm} km
        </label>
        <input
          id="radius"
          type="range"
          min={1}
          max={10}
          value={radiusKm}
          onChange={(e) => setRadiusKm(Number(e.target.value))}
          disabled={selectedFoods.length === 0}
          className="w-full accent-primary"
        />
        <button
          onClick={compare}
          disabled={selectedFoods.length === 0 || comparing}
          className="mt-4 w-full bg-primary text-white py-3 rounded-full font-semibold transition-shadow enabled:hover:shadow-[0_4px_10px_rgba(255,71,87,0.3)] disabled:opacity-40"
        >
          {comparing ? (
            <>
              <i className="fa-solid fa-spinner fa-spin mr-2" aria-hidden />
              Comparing nearby…
            </>
          ) : (
            <>
              <i className="fa-solid fa-wand-magic-sparkles mr-2" aria-hidden />
              Find package prices nearby
            </>
          )}
        </button>
      </section>

      {/* Results */}
      {results.length > 0 && (
        <section className="pb-4">
          <h2 className="font-bold mb-3">
            Packages within {radiusKm} km ({results.length})
          </h2>
          <div className="space-y-3">
            {results.map((result, i) => {
              const missing = selected.length - result.items.length;
              return (
                <div
                  key={result.restaurant.id}
                  className={`bg-card rounded-xl p-4 shadow-card border ${
                    i === 0 ? "border-primary" : "border-line"
                  }`}
                >
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-semibold">
                        {i === 0 && (
                          <span className="bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            BEST
                          </span>
                        )}
                        <span className="truncate">{result.restaurant.name}</span>
                      </div>
                      <p className="text-xs text-text-light mt-0.5">
                        {result.restaurant.distanceKm} km · ⭐ {result.restaurant.rating}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-extrabold text-lg text-primary">
                        ৳{result.total}
                      </div>
                      {cheapest && i !== 0 && cheapest.total !== result.total && (
                        <div className="text-[11px] text-text-light line-through">
                          was your baseline
                        </div>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-1.5">
                    {result.items.map((item) => (
                      <li key={item.food.id} className="flex justify-between text-sm">
                        <span className="text-text-dark">{item.food.name}</span>
                        <span className="text-text-light">৳{item.price}</span>
                      </li>
                    ))}
                  </ul>
                  {missing > 0 && (
                    <p className="text-[11px] text-text-light mt-2 italic">
                      {missing} item(s) matched to a similar category dish at this restaurant.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {results.length === 0 && (
            <p className="text-sm text-text-light text-center py-6">
              No restaurant within {radiusKm} km offers this full bundle. Try a bigger radius.
            </p>
          )}
        </section>
      )}

      {/* Quick add suggestions */}
      <section className="pb-4">
        <h2 className="font-bold mb-3">Quick add popular dishes</h2>
        <div className="flex gap-2 flex-wrap">
          {allFoods.slice(0, 8).map((food) => (
            <button
              key={food.id}
              onClick={() =>
                setSelected((s) =>
                  s.includes(food.id) ? s.filter((x) => x !== food.id) : [...s, food.id],
                )
              }
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selected.includes(food.id)
                  ? "bg-primary text-white border-primary"
                  : "bg-card text-text-light border-line"
              }`}
            >
              + {food.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
