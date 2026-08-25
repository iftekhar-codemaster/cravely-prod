"use client";

import Link from "next/link";
import type { Restaurant } from "@/lib/data";
import { haversineKm } from "@/lib/geo";
import { useUserLocation } from "@/lib/useUserLocation";

export default function MapsRestaurantList({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  const userLocation = useUserLocation();

  const rows = restaurants
    .map((r) => ({
      r,
      realKm:
        userLocation && typeof r.lat === "number" && typeof r.lng === "number"
          ? haversineKm(userLocation.lat, userLocation.lng, r.lat, r.lng)
          : null,
    }))
    .sort(
      (a, b) =>
        (a.realKm ?? a.r.distanceKm) - (b.realKm ?? b.r.distanceKm)
    );

  return (
    <ul className="space-y-2 pb-4">
      {rows.map(({ r, realKm }) => (
        <li key={r.id}>
          <Link
            href={`/restaurants/${r.id}`}
            className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-card border border-line hover:text-primary transition-colors"
          >
            <i className="fa-solid fa-location-dot text-primary w-5 text-center" aria-hidden />
            <span className="flex-1 text-sm font-medium truncate">{r.name}</span>
            <span className="text-xs text-text-light">
              {realKm !== null
                ? `${realKm.toFixed(1)} km away`
                : `${r.distanceKm} km`}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
