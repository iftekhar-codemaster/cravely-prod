"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUserLocation } from "@/lib/useUserLocation";
import { haversineKm } from "@/lib/geo";

/**
 * Shows the restaurant's SAVED location (set by the owner in Restaurant
 * Studio) on a small Leaflet map with Carto tiles, plus a free Google Maps
 * directions button (no API key — opens the directions UI from the user's
 * current location).
 */
export default function LocationMap({
  lat,
  lng,
  address,
  ownerHint,
}: {
  lat?: number;
  lng?: number;
  address?: string;
  ownerHint?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const userLoc = useUserLocation();

  const hasCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  useEffect(() => {
    if (!hasCoords || !containerRef.current) return;
    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;
      map = L.map(containerRef.current, {
        center: [lat!, lng!],
        zoom: 15,
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      }).addTo(map);
      L.marker([lat!, lng!], {
        icon: L.divIcon({
          html: '<div style="font-size:30px">📍</div>',
          className: "",
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        }),
      }).addTo(map);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng, hasCoords]);

  if (!hasCoords) {
    return (
      <div className="rounded-xl border border-dashed border-line p-4">
        <div className="flex items-center gap-2 text-text-light">
          <i className="fa-solid fa-map-pin" aria-hidden />
          <span className="text-sm">{address || "Location not set"}</span>
        </div>
        {ownerHint && (
          <p className="text-[11px] text-text-light mt-1.5">
            Set your location in Restaurant Studio so customers can find you.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="rounded-xl overflow-hidden border border-line relative h-44 bg-gray-100">
        <div ref={containerRef} className="absolute inset-0 z-0" />
        {!ready && <div className="absolute inset-0 skel" />}
      </div>
      <div className="flex gap-4 mt-2 flex-wrap items-center">
        {userLoc && (
          <span className="text-xs text-text-light">
            <i className="fa-solid fa-location-dot mr-1" aria-hidden />
            {haversineKm(userLoc.lat, userLoc.lng, lat!, lng!).toFixed(1)} km away
          </span>
        )}
        <a
          href={`https://www.google.com/maps/dir/?api=1${userLoc ? `&origin=${userLoc.lat},${userLoc.lng}` : ""}&destination=${lat},${lng}&travelmode=driving`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          <i className="fa-solid fa-diamond-turn-right" aria-hidden />
          Get directions
        </a>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-light hover:text-primary transition-colors"
        >
          <i className="fa-brands fa-google" aria-hidden />
          Open in Google Maps
        </a>
        <Link
          href="/maps"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-light hover:text-primary transition-colors"
        >
          <i className="fa-solid fa-map-location-dot" aria-hidden />
          Nearby map
        </Link>
      </div>
    </div>
  );
}
