// Data layer — reads from Google Firestore (Plan.md) when Firebase env vars
// are configured, otherwise falls back to the bundled mock dataset so the
// app still runs in development. The UI only ever calls these functions.
//
// Run `npm run seed` once to populate Firestore from src/lib/mock-data.ts.

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

const cache: {
  restaurants?: Restaurant[];
  foods?: Food[];
  stories?: Story[];
  offers?: Offer[];
  cuisines?: string[];
} = {};

async function fetchCollection<T extends object>(name: string): Promise<T[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as T[];
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  if (!isFirebaseConfigured) return mockRestaurants;
  if (cache.restaurants) return cache.restaurants;
  try {
    const rows = await fetchCollection<Restaurant>("restaurants");
    cache.restaurants = rows.length ? rows : mockRestaurants;
  } catch (err) {
    console.warn("[cravely] Failed to load restaurants:", err);
    cache.restaurants = mockRestaurants;
  }
  return cache.restaurants;
}

export async function getAllFoods(): Promise<Food[]> {
  if (!isFirebaseConfigured) return mockFoods;
  if (cache.foods) return cache.foods;
  try {
    const rows = await fetchCollection<Food>("foods");
    cache.foods = rows.length ? rows : mockFoods;
  } catch (err) {
    console.warn("[cravely] Failed to load foods:", err);
    cache.foods = mockFoods;
  }
  return cache.foods;
}

export async function getStories(): Promise<Story[]> {
  if (!isFirebaseConfigured) return mockStories;
  if (cache.stories) return cache.stories;
  try {
    const rows = await fetchCollection<Story>("stories");
    cache.stories = rows.length ? rows : mockStories;
  } catch (err) {
    console.warn("[cravely] Failed to load stories:", err);
    cache.stories = mockStories;
  }
  return cache.stories;
}

export async function getOffers(): Promise<Offer[]> {
  if (!isFirebaseConfigured) return mockOffers;
  if (cache.offers) return cache.offers;
  try {
    const rows = await fetchCollection<Offer>("offers");
    cache.offers = rows.length ? rows : mockOffers;
  } catch (err) {
    console.warn("[cravely] Failed to load offers:", err);
    cache.offers = mockOffers;
  }
  return cache.offers;
}

export async function getCuisines(): Promise<string[]> {
  if (!isFirebaseConfigured) return mockCuisines;
  if (cache.cuisines) return cache.cuisines;
  try {
    const docs = await fetchCollection<{ items?: string[] }>("cuisines");
    const items = docs[0]?.items;
    cache.cuisines = items?.length ? items : mockCuisines;
  } catch (err) {
    console.warn("[cravely] Failed to load cuisines:", err);
    cache.cuisines = mockCuisines;
  }
  return cache.cuisines;
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

export async function getFoodsByIds(ids: string[]): Promise<Food[]> {
  if (!ids.length) return [];
  const all = await getAllFoods();
  return ids
    .map((id) => all.find((f) => f.id === id))
    .filter((f): f is Food => Boolean(f));
}

export async function searchFoods(query: string): Promise<Food[]> {
  const all = await getAllFoods();
  const q = query.toLowerCase();
  return all.filter(
    (f) =>
      f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q),
  );
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
      const wanted =
        allFoods.find((f) => f.name === name && dishIds.some((id) => f.id === id)) ??
        allFoods.find((f) => f.name === name);
      const match =
        allFoods.find((f) => f.restaurantId === restaurant.id && f.name === name) ??
        // fallback: closest category match within the same restaurant
        (wanted &&
          allFoods.find(
            (f) =>
              f.restaurantId === restaurant.id && f.category === wanted.category,
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
