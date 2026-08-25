"use client";

import { useEffect, useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getDb } from "./firebase";
import { isGeoOptedIn } from "./track";

export type UserLocation = { lat: number; lng: number };

let captured = false;

/**
 * One-shot geolocation lookup on mount. Held in component state; when the
 * user has previously consented to location personalization (geoOptIn) and
 * is signed in, the coords are also mirrored to their profile (once per
 * session) so range-targeted notifications can reach them.
 */
export function useUserLocation(): UserLocation | null {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (cancelled) return;
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        if (!captured && isGeoOptedIn()) {
          captured = true;
          const user = getFirebaseAuth()?.currentUser;
          const db = getDb();
          if (user && db) {
            void setDoc(
              doc(db, "users", user.uid),
              { locationLat: loc.lat, locationLng: loc.lng },
              { merge: true },
            ).catch(() => undefined);
          }
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
