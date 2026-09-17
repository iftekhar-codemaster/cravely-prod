"use client";

import { useUserLocation } from "@/lib/useUserLocation";
import { haversineKm } from "@/lib/geo";

export default function RestaurantDistance({
  lat,
  lng,
  fallbackKm,
  showIcon = true,
  className = "text-text-light",
}: {
  lat?: number;
  lng?: number;
  fallbackKm?: number;
  showIcon?: boolean;
  className?: string;
}) {
  const loc = useUserLocation();

  let text = "— km";

  if (loc && lat != null && lng != null) {
    const km = haversineKm(loc.lat, loc.lng, lat, lng);
    text = `${km < 0.1 ? "<0.1" : km.toFixed(1)} km`;
  } else if (fallbackKm != null && Number.isFinite(fallbackKm) && fallbackKm > 0) {
    text = `${fallbackKm < 0.1 ? "<0.1" : fallbackKm.toFixed(1)} km`;
  }

  return (
    <span className={className}>
      {showIcon && <i className="fa-solid fa-location-dot mr-1" aria-hidden />}
      {text}
    </span>
  );
}
