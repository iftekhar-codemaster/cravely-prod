"use client";

import { useEffect, useRef, useState } from "react";
import type { Restaurant } from "@/lib/data";
import { haversineKm } from "@/lib/geo";
import { useUserLocation, type UserLocation } from "@/lib/useUserLocation";
import {
  googleMapsConfigured,
  loadGoogleMaps,
} from "@/lib/googleMaps";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

type Props = { restaurants: Restaurant[] };

function popupHtml(r: Restaurant, loc: UserLocation | null): string {
  const dist = loc ? haversineKm(loc.lat, loc.lng, r.lat!, r.lng!) : null;
  return `
    <div style="min-width:170px">
      <p class="font-semibold text-sm text-gray-900">${escapeHtml(r.name)}</p>
      <p class="text-xs text-gray-500">${escapeHtml(r.cuisine)} · ★ ${r.rating}</p>
      ${dist !== null ? `<p class="text-xs text-gray-500 mt-1">${dist.toFixed(1)} km away</p>` : ""}
      <a href="/restaurants/${r.id}" class="inline-block mt-1.5 text-xs font-semibold text-primary">View kitchen →</a>
    </div>
  `;
}

const DEFAULT_CENTER: [number, number] = [26.0337, 88.4616]; // Thakurgaon

export default function RestaurantsMap({ restaurants }: Props) {
  const hasGoogle = googleMapsConfigured();
  const [provider, setProvider] = useState<"osm" | "google">("osm");

  return (
    <div className="mb-6">
      {hasGoogle && (
        <div className="flex gap-1 mb-2 p-1 rounded-full bg-card border border-line w-fit">
          {(
            [
              { key: "osm", label: "OpenStreetMap" },
              { key: "google", label: "Google Maps" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setProvider(t.key)}
              aria-pressed={provider === t.key}
              className={`text-[11px] font-semibold px-3.5 py-1.5 rounded-full transition-colors ${
                provider === t.key
                  ? "bg-primary text-white shadow-sm"
                  : "text-text-light hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="relative h-72 rounded-xl overflow-hidden shadow-card border border-line bg-gray-100 z-0">
        {provider === "osm" ? (
          <OsmMap restaurants={restaurants} />
        ) : (
          <GoogleMap restaurants={restaurants} />
        )}
      </div>
    </div>
  );
}

/* ---------------- OpenStreetMap (Leaflet) ---------------- */

function OsmMap({ restaurants }: Props) {
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
          .bindPopup(() => popupHtml(r, locationRef.current))
          .addTo(group);
      }
      group.addTo(map);
      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 15 });
      } else {
        map.setView(DEFAULT_CENTER, 13);
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
    <>
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && <div className="absolute inset-0 skel" />}
      {ready && !userLocation && (
        <span className="absolute bottom-2 left-2 z-[500] text-[10px] text-text-light bg-white/90 px-2 py-1 rounded-full">
          Enable location to see distances
        </span>
      )}
    </>
  );
}

/* ---------------- Google Maps ---------------- */

function GoogleMap({ restaurants }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const userLocation = useUserLocation();
  const gmapsRef = useRef<{
    map: google.maps.Map;
    markers: google.maps.Marker[];
    infoWindow: google.maps.InfoWindow;
    userMarker: google.maps.Marker | null;
  } | null>(null);
  const locationRef = useRef<UserLocation | null>(null);
  const restaurantsRef = useRef(restaurants);

  useEffect(() => {
    restaurantsRef.current = restaurants;
    locationRef.current = userLocation;
  }, [restaurants, userLocation]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await loadGoogleMaps();
      if (!ok || cancelled || !containerRef.current || gmapsRef.current) {
        if (!ok) setFailed(true);
        return;
      }
      const g = window.google.maps;

      const map = new g.Map(containerRef.current, {
        center: { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] },
        zoom: 13,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });
      const infoWindow = new g.InfoWindow();
      const markers: google.maps.Marker[] = [];

      for (const r of restaurantsRef.current) {
        if (typeof r.lat !== "number" || typeof r.lng !== "number") continue;
        const marker = new g.Marker({
          position: { lat: r.lat, lng: r.lng },
          map,
          title: r.name,
        });
        marker.addListener("click", () => {
          infoWindow.setContent(popupHtml(r, locationRef.current));
          infoWindow.open({ anchor: marker, map });
        });
        markers.push(marker);
      }

      if (markers.length > 0) {
        const bounds = new g.LatLngBounds();
        markers.forEach((m) => bounds.extend(m.getPosition()!));
        map.fitBounds(bounds, 60);
      }

      gmapsRef.current = { map, markers, infoWindow, userMarker: null };
      setReady(true);
    })();

    return () => {
      cancelled = true;
      gmapsRef.current = null;
      setReady(false);
    };
  }, []);

  useEffect(() => {
    const ctx = gmapsRef.current;
    if (!ctx || !userLocation) return;
    const g = window.google.maps;
    locationRef.current = userLocation;
    const pos = { lat: userLocation.lat, lng: userLocation.lng };

    if (!ctx.userMarker) {
      ctx.userMarker = new g.Marker({
        position: pos,
        map: ctx.map,
        title: "You are here",
        icon: {
          path: g.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
        },
      });
    } else {
      ctx.userMarker.setPosition(pos);
    }

    const bounds = new g.LatLngBounds();
    ctx.markers.forEach((m) => bounds.extend(m.getPosition()!));
    bounds.extend(pos);
    ctx.map.fitBounds(bounds, 60);
  }, [userLocation, ready]);

  if (failed) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
        <i className="fa-solid fa-triangle-exclamation text-2xl text-text-light mb-2" aria-hidden />
        <p className="text-xs text-text-light">
          Google Maps failed to load — check the API key configuration.
        </p>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />
      {!ready && <div className="absolute inset-0 skel" />}
    </>
  );
}
