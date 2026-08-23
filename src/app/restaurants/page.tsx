import type { Metadata } from "next";
import RestaurantList from "@/components/RestaurantList";

export const metadata: Metadata = { title: "Restaurants — Cravely" };

export default function RestaurantsPage() {
  return <RestaurantList />;
}
