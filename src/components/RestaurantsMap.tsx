"use client";

import { useEffect, useRef, useState } from "react";
import type { Restaurant } from "@/lib/data";
import { haversineKm } from "@/lib/geo";
import { useUserLocation, type UserLocation } from "@/lib/useUserLocation";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export default function RestaurantsMap({
  restaurants,
}: {
  restaurants: Restaurant[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const userLocation = useUserLocation();
  const leafletRef = useRef<{
    L: typeof import("leaflet");
    map: import("leaflet").Map;
    userMarker: import("leaflet").Marker | null;
  } | null>(null);
  const locationRef = useRef<UserLocation | null>(null);

  useEffect(() => {
    locationRef.current = userLocation;
  }, [userLocation]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || leafletRef.current) return;

      const map = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      });
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
        }
      ).addTo(map);

      const group = L.featureGroup();
      for (const r of restaurants) {
        if (typeof r.lat !== "number" || typeof r.lng !== "number") continue;
        L.marker([r.lat, r.lng], {
          icon: L.divIcon({
            html: '<div style="font-size:30px">📍</div>',
            className: "",
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          }),
          title: r.name,
        })
          .bindPopup(() => {
            const loc = locationRef.current;
            const dist =
              loc
                ? haversineKm(loc.lat, loc.lng, r.lat!, r.lng!)
                : null;
            return `
              <div style="min-width:170px">
                <p class="font-semibold text-sm text-gray-900">${escapeHtml(r.name)}</p>
                <p class="text-xs text-gray-500">${escapeHtml(r.cuisine)} · ★ ${r.rating}</p>
                ${dist !== null ? `<p class="text-xs text-gray-500 mt-1">${dist.toFixed(1)} km away</p>` : ""}
                <a href="/restaurants/${r.id}" class="inline-block mt-1.5 text-xs font-semibold text-primary">View kitchen →</a>
              </div>
            `;
          })
          .addTo(group);
      }
      group.addTo(map);
      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 15 });
      } else {
        map.setView([26.0337, 88.4616], 13);
      }

      leafletRef.current = { L, map, userMarker: null };
      setReady(true);
    })();

    return () => {
      cancelled = true;
      leafletRef.current?.map.remove();
      leafletRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const ctx = leafletRef.current;
    if (!ctx || !userLocation) return;
    const { L, map } = ctx;
    const latlng: [number, number] = [userLocation.lat, userLocation.lng];

    if (!ctx.userMarker) {
      ctx.userMarker = L.marker(latlng, {
        icon: L.divIcon({
          html: `<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px #2563eb55"></div>`,
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
        title: "You are here",
      }).addTo(map);
    } else {
      ctx.userMarker.setLatLng(latlng);
    }

    const bounds = L.latLngBounds([]);
    for (const r of restaurants) {
      if (typeof r.lat === "number" && typeof r.lng === "number") {
        bounds.extend([r.lat, r.lng]);
      }
    }
    if (bounds.isValid()) {
      bounds.extend(latlng);
      map.fitBounds(bounds.pad(0.25), { maxZoom: 15 });
    } else {
      map.setView(latlng, 14);
    }
  }, [userLocation, ready, restaurants]);

  return (
    <div className="relative h-72 rounded-xl overflow-hidden shadow-card border border-line mb-6 bg-gray-100 z-0">
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && <div className="absolute inset-0 skel" />}
      {ready && !userLocation && (
        <span className="absolute bottom-2 left-2 z-[500] text-[10px] text-text-light bg-white/90 px-2 py-1 rounded-full">
          Enable location to see distances
        </span>
      )}
    </div>
  );
}
