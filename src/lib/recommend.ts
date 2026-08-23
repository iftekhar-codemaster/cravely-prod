import type { Food, Restaurant } from "./data";

// Cravely recommendation engine.
//
// Weighted scoring across four psychological drivers:
//   1. Familiarity  — dishes similar to what the user loved/viewed (mere-exposure)
//   2. Social proof — ratings + review volume
//   3. Proximity    — distance matters more when location is shared
//   4. Discovery    — mild exploration bonus so the feed never feels frozen

export type Recommendation = {
  food: Food;
  score: number;
  reasons: string[];
};

export type ScoreInput = {
  foods: Food[];
  restaurants: Restaurant[];
  loved: string[];
  views: Record<string, number>;
  geoOptIn: boolean;
};

function logScale(n: number, max: number): number {
  return Math.log10(1 + n) / Math.log10(1 + max);
}

export function recommendDishes({
  foods,
  restaurants,
  loved,
  views,
  geoOptIn,
}: ScoreInput): Recommendation[] {
  const restaurantById = new Map(restaurants.map((r) => [r.id, r]));
  const lovedSet = new Set(loved);
  const maxReviews = Math.max(1, ...foods.map((f) => f.reviews));

  // Affinity profiles from behavior
  const categoryAffinity = new Map<string, number>();
  const cuisineAffinity = new Map<string, number>();
  let priceSum = 0;
  let priceN = 0;

  const bump = (m: Map<string, number>, k: string, w: number) => {
    if (k) m.set(k, (m.get(k) ?? 0) + w);
  };

  for (const f of foods) {
    if (lovedSet.has(f.id)) {
      bump(categoryAffinity, f.category, 3);
      bump(cuisineAffinity, restaurantById.get(f.restaurantId)?.cuisine ?? "", 2);
      priceSum += f.price;
      priceN++;
    }
    const seen = views[f.id] ?? 0;
    if (seen > 0 && !lovedSet.has(f.id)) {
      bump(categoryAffinity, f.category, seen * 0.6);
      bump(
        cuisineAffinity,
        restaurantById.get(f.restaurantId)?.cuisine ?? "",
        seen * 0.4,
      );
    }
  }
  const avgLovedPrice = priceN > 0 ? priceSum / priceN : null;

  const results: Recommendation[] = foods.map((food) => {
    const reasons: string[] = [];
    let score = 0;

    // Social proof (trust)
    const social = food.rating * 1.1 + logScale(food.reviews, maxReviews) * 0.9;
    score += social;

    // Proximity (convenience)
    const r = restaurantById.get(food.restaurantId);
    const dist = Math.min(r?.distanceKm ?? 5, 10);
    const proximity = ((10 - dist) / 10) * (geoOptIn ? 3 : 1.6);
    score += proximity;
    if (geoOptIn && dist <= 2.5) reasons.push("Very close to you");

    // Familiarity (mere-exposure effect)
    const cat = categoryAffinity.get(food.category) ?? 0;
    if (cat > 0) {
      score += cat * 1.4;
      reasons.push(`You're into ${food.category}`);
    }
    const cui = cuisineAffinity.get(r?.cuisine ?? "") ?? 0;
    if (cui > 0) score += cui * 0.9;

    if (lovedSet.has(food.id)) score -= 8; // don't recommend what they already have
    if (avgLovedPrice != null && priceN >= 2) {
      const drift = Math.abs(food.price - avgLovedPrice) / avgLovedPrice;
      if (drift < 0.25) {
        score += 1.2;
        reasons.push("Fits your usual budget");
      } else score -= drift * 0.8;
    }

    // Exploration bonus with decay on over-seen items
    const seen = views[food.id] ?? 0;
    if (seen === 0) score += 0.7;
    else score -= seen * 0.35;

    if (r?.verified) score += 0.4;

    return { food, score, reasons: reasons.slice(0, 2) };
  });

  results.sort((a, b) => b.score - a.score);

  // Category diversity cap: max 2 per category in the top slice
  const perCategory = new Map<string, number>();
  const diverse: Recommendation[] = [];
  for (const rec of results) {
    const n = perCategory.get(rec.food.category) ?? 0;
    if (n >= 2 && diverse.length < 12) continue;
    perCategory.set(rec.food.category, n + 1);
    diverse.push(rec);
    if (diverse.length >= 12) break;
  }
  return diverse;
}

/** Cold-start fallback: best-rated nearby picks. */
export function defaultPicks(foods: Food[], restaurants: Restaurant[]): Recommendation[] {
  return recommendDishes({
    foods,
    restaurants,
    loved: [],
    views: {},
    geoOptIn: false,
  }).slice(0, 8);
}
