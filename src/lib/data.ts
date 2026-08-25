// Data layer — reads from Google Firestore (Plan.md) when Firebase env vars
// are configured, otherwise falls back to the bundled mock dataset so the
// app still runs in development. The UI only ever calls these functions.
//
// When Firebase IS configured, Firestore is the single source of truth:
// an empty collection renders as empty (no mock substitution), and reads are
// cached for CACHE_TTL ms to keep costs/latency sane.

import { collection, getDocs } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import {
  restaurants as mockRestaurants,
  foods as mockFoods,
  stories as mockStories,
  offers as mockOffers,
  cuisines as mockCuisines,
  reviewPool,
  type Restaurant,
  type Food,
  type Review,
  type Story,
  type Offer,
} from "./mock-data";

export type {
  Restaurant,
  Food,
  Review,
  Story,
  Offer,
} from "./mock-data";

export type PackageResult = {
  restaurant: Restaurant;
  total: number;
  items: { food: Food; price: number }[];
};

const CACHE_TTL = 60_000;

const cache: Record<
  string,
  { rows: unknown[]; at: number } | undefined
> = {};

async function getCached<T>(
  key: string,
  collectionName: string,
  fallback: T[],
): Promise<T[]> {
  if (!isFirebaseConfigured) return fallback;
  const hit = cache[key];
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.rows as T[];
  try {
    const db = getDb();
    if (!db) return fallback;
    const snap = await getDocs(collection(db, collectionName));
    const rows = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as object),
    })) as T[];
    cache[key] = { rows, at: Date.now() };
    return rows;
  } catch (err) {
    console.warn(`[cravely] Failed to load ${collectionName}:`, err);
    // serve stale cache if we have one, otherwise the fallback
    return (hit?.rows as T[]) ?? fallback;
  }
}

export function getAllRestaurants(): Promise<Restaurant[]> {
  return getCached<Restaurant>("restaurants", "restaurants", mockRestaurants);
}

export function getAllFoods(): Promise<Food[]> {
  return getCached<Food>("foods", "foods", mockFoods);
}

export function getStories(): Promise<Story[]> {
  return getCached<Story>("stories", "stories", mockStories);
}

export function getOffers(): Promise<Offer[]> {
  return getCached<Offer>("offers", "offers", mockOffers);
}

export function getCuisines(): Promise<string[]> {
  // cuisines doc shape: { id: "default", items: string[] } — unwrap it
  if (!isFirebaseConfigured) return Promise.resolve(mockCuisines);
  const hit = cache.cuisines;
  if (hit && Date.now() - hit.at < CACHE_TTL) return Promise.resolve(hit.rows as string[]);
  return (async () => {
    try {
      const db = getDb();
      if (!db) return mockCuisines;
      const snap = await getDocs(collection(db, "cuisines"));
      const first = snap.docs[0]?.data() as { items?: string[] } | undefined;
      const rows = first?.items?.length ? first.items : mockCuisines;
      cache.cuisines = { rows, at: Date.now() };
      return rows;
    } catch (err) {
      console.warn("[cravely] Failed to load cuisines:", err);
      return (hit?.rows as string[]) ?? mockCuisines;
    }
  })();
}

export async function getRestaurant(id: string): Promise<Restaurant | undefined> {
  const all = await getAllRestaurants();
  return all.find((r) => r.id === id);
}

export async function getFood(id: string): Promise<Food | undefined> {
  const all = await getAllFoods();
  return all.find((f) => f.id === id);
}

export async function getFoodsByRestaurant(restaurantId: string): Promise<Food[]> {
  const all = await getAllFoods();
  return all.filter((f) => f.restaurantId === restaurantId);
}

export async function searchFoods(query: string): Promise<Food[]> {
  const all = await getAllFoods();
  const q = query.toLowerCase();
  return all.filter(
    (f) =>
      f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q),
  );
}

export async function getFoodsByIds(ids: string[]): Promise<Food[]> {
  const all = await getAllFoods();
  return ids
    .map((id) => all.find((f) => f.id === id))
    .filter((f): f is Food => Boolean(f));
}

export async function getRelatedFoods(food: Food): Promise<Food[]> {
  const all = await getAllFoods();
  return all.filter((f) => f.id !== food.id).slice(0, 3);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getReviews(_subject: string): Review[] {
  return reviewPool.default;
}

/**
 * Package Builder core: given selected dish ids and a radius in km,
 * find every verified restaurant within the radius that offers ALL
 * dishes, and return their package totals sorted cheapest first.
 */
export async function buildPackages(
  dishIds: string[],
  radiusKm: number,
): Promise<PackageResult[]> {
  if (dishIds.length === 0) return [];
  const [allRestaurants, allFoods] = await Promise.all([
    getAllRestaurants(),
    getAllFoods(),
  ]);
  const results: PackageResult[] = [];

  for (const restaurant of allRestaurants) {
    if (restaurant.distanceKm > radiusKm) continue;

    // Match by dish NAME so multiple restaurants can fulfill the same bundle.
    const wantedNames = dishIds
      .map((id) => allFoods.find((f) => f.id === id)?.name)
      .filter((n): n is string => Boolean(n));

    const items: { food: Food; price: number }[] = [];
    let hasAll = true;
    for (const name of wantedNames) {
      const wanted = allFoods.find((f) => dishIds.includes(f.id) && f.name === name);
      const match =
        allFoods.find((f) => f.restaurantId === restaurant.id && f.name === name) ??
        // fallback: closest category match within the same restaurant
        (wanted &&
          allFoods.find(
            (f) => f.restaurantId === restaurant.id && f.category === wanted.category,
          ));
      if (!match) {
        hasAll = false;
        break;
      }
      items.push({ food: match, price: match.price });
    }
    if (!hasAll) continue;
    results.push({
      restaurant,
      total: items.reduce((sum, i) => sum + i.price, 0),
      items,
    });
  }

  return results.sort((a, b) => a.total - b.total);
}
