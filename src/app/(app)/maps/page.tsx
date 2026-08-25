import type { Metadata } from "next";
import { getAllRestaurants } from "@/lib/data";
import { APP_URL } from "@/lib/site";
import RestaurantsMap from "@/components/RestaurantsMap";
import MapsRestaurantList from "@/components/MapsRestaurantList";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Map view",
  description:
    "Find every Cravely kitchen near you in Thakurgaon, sorted by distance.",
  alternates: { canonical: `${APP_URL}/maps` },
};

export default async function MapsPage() {
  const restaurants = await getAllRestaurants();
  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-semibold mb-1">
        <i className="fa-solid fa-map-location-dot text-primary mr-2" aria-hidden />
        Map view
      </h1>
      <p className="text-sm text-text-light mb-5">
        Every Cravely kitchen on the map — sorted by distance from you.
      </p>

      <RestaurantsMap restaurants={restaurants} />

      <h2 className="font-bold mb-3">Nearby ({restaurants.length})</h2>
      <MapsRestaurantList restaurants={restaurants} />
    </div>
  );
}
