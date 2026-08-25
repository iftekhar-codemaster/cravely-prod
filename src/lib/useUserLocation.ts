"use client";

import { useEffect, useState } from "react";

export type UserLocation = { lat: number; lng: number };

/**
 * One-shot geolocation lookup on mount. Never persisted or transmitted —
 * only held in component state. Returns null until granted (or forever on
 * deny/failure/unsupported).
 */
export function useUserLocation(): UserLocation | null {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
      },
      () => {},
      { timeout: 10000, maximumAge: 60000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return location;
}
