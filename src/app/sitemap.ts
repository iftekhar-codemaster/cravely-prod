import type { MetadataRoute } from "next";
import { getAllFoods, getAllRestaurants } from "@/lib/data";
import { APP_URL, LANDING_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [foods, restaurants] = await Promise.all([
    getAllFoods(),
    getAllRestaurants(),
  ]);

  return [
    // Landing (apex domain)
    { url: LANDING_URL, changeFrequency: "weekly", priority: 0.8 },
    { url: `${LANDING_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${LANDING_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    // App (canonical, indexed)
    { url: APP_URL, changeFrequency: "daily", priority: 1 },
    { url: `${APP_URL}/restaurants`, changeFrequency: "daily", priority: 0.9 },
    { url: `${APP_URL}/search`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${APP_URL}/maps`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${APP_URL}/packages`, changeFrequency: "weekly", priority: 0.5 },
    ...restaurants.map((r) => ({
      url: `${APP_URL}/restaurants/${r.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...foods.map((f) => ({
      url: `${APP_URL}/product/${f.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
