import type { Metadata } from "next";
import RestaurantList from "@/components/RestaurantList";
import { getAllRestaurants } from "@/lib/data";
import { APP_URL } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Restaurants",
  description:
    "Every kitchen in Thakurgaon — ratings, opening hours and honest prices. Browse all restaurants on Cravely.",
  alternates: { canonical: `${APP_URL}/restaurants` },
};

export default async function RestaurantsPage() {
  const restaurants = await getAllRestaurants();
  return <RestaurantList restaurants={restaurants} />;
}
