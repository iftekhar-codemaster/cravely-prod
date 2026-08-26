"use client";

import { useUserLocation } from "@/lib/useUserLocation";
import { haversineKm } from "@/lib/geo";

export default function RestaurantDistance({
  lat,
  lng,
}: {
  lat?: number;
  lng?: number;
}) {
  const loc = useUserLocation();

  if (!lat || !lng || !loc) {
    return (
      <span className="text-text-light">
        <i className="fa-solid fa-location-dot mr-1" aria-hidden />
        — km
      </span>
    );
  }

  const km = haversineKm(loc.lat, loc.lng, lat, lng);
  return (
    <span className="text-text-light">
      <i className="fa-solid fa-location-dot mr-1" aria-hidden />
      {km < 0.1 ? "<0.1" : km.toFixed(1)} km
    </span>
  );
}
