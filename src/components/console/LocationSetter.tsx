"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import type { Map as LeafletMap, Marker, LeafletMouseEvent } from "leaflet";
import { audit } from "@/lib/audit";
import { getDb } from "@/lib/firebase";

type Props = {
  restaurantId: string;
  initialLat?: number;
  initialLng?: number;
};

export default function LocationSetter({ restaurantId, initialLat, initialLng }: Props) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null,
  );
  const [open, setOpen] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [busy, setBusy] = useState(false);

  const save = useCallback(
    async (lat: number, lng: number) => {
      setBusy(true);
      try {
        await updateDoc(doc(getDb()!, "restaurants", restaurantId), { lat, lng });
        void audit("restaurant.location", restaurantId, { lat, lng });
        setCoords({ lat, lng });
        setOpen(false);
      } catch {
        alert("Could not save location — please try again.");
      } finally {
        setBusy(false);
      }
    },
    [restaurantId],
  );

  const useGps = () => {
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("Location permission denied — pick on the map instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => void save(pos.coords.latitude, pos.coords.longitude).catch(() => undefined),
      () => setGpsError("Location permission denied — pick on the map instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-card anim-fade-up mt-4">
      <div className="flex items-center gap-2 font-bold text-sm">
        <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs">
          <i className="fa-solid fa-map-pin" aria-hidden />
        </span>
        Location
      </div>
      <p className="text-xs text-text-light mt-2">
        {coords
          ? `Set ✓ · ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
          : "Not set yet"}
      </p>
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={useGps}
          disabled={busy}
          className="pressable text-xs font-bold px-4 py-2 rounded-full bg-primary text-white shadow-[0_4px_12px_rgba(255,71,87,0.3)] disabled:opacity-60"
        >
          <i className="fa-solid fa-location-crosshairs mr-1.5" aria-hidden />
          Use my current location
        </button>
        <button
          onClick={() => {
            setGpsError("");
            setOpen(true);
          }}
          disabled={busy}
          className="pressable text-xs font-bold px-4 py-2 rounded-full border border-line bg-background"
        >
          <i className="fa-solid fa-map mr-1.5" aria-hidden />
          Pick on map
        </button>
      </div>
      {gpsError && (
        <p className="text-[11px] font-semibold text-red-500 bg-red-50 rounded-lg p-2.5 mt-3">
          {gpsError}
        </p>
      )}
      {open && (
        <MapModal
          initialLat={coords?.lat ?? initialLat}
          initialLng={coords?.lng ?? initialLng}
          busy={busy}
          onCancel={() => setOpen(false)}
          onSave={(lat, lng) => void save(lat, lng)}
        />
      )}
    </section>
  );
}

function MapModal({
  initialLat,
  initialLng,
  busy,
  onCancel,
  onSave,
}: {
  initialLat?: number;
  initialLng?: number;
  busy: boolean;
  onCancel: () => void;
  onSave: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current) return;

      const center: [number, number] =
        initialLat != null && initialLng != null ? [initialLat, initialLng] : [26.0333, 88.4667];

      const map = L.map(containerRef.current).setView(center, 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      const icon = L.divIcon({
        html: '<div style="font-size:28px">📍</div>',
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      if (initialLat != null && initialLng != null) {
        markerRef.current = L.marker([initialLat, initialLng], { icon }).addTo(map);
        setPin({ lat: initialLat, lng: initialLng });
      }

      map.on("click", (e: LeafletMouseEvent) => {
        markerRef.current?.remove();
        markerRef.current = L.marker([e.latlng.lat, e.latlng.lng], { icon }).addTo(map);
        setPin({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapRef.current = map;
    }

    void init().catch((err) => console.warn("[cravely] map init:", err));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-line overflow-hidden anim-fade-up">
        <h3 className="font-bold text-sm p-4 pb-2">Tap the map to drop a pin</h3>
        <div ref={containerRef} className="h-72 w-full" />
        <div className="p-4 pt-3 text-[11px] text-text-light">
          {pin
            ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`
            : "No pin placed yet — tap anywhere on the map."}
        </div>
        <div className="flex gap-2 p-4 pt-0">
          <button
            onClick={onCancel}
            className="pressable flex-1 py-2.5 rounded-full border border-line text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={() => pin && onSave(pin.lat, pin.lng)}
            disabled={!pin || busy}
            className="pressable flex-1 py-2.5 rounded-full bg-primary text-white text-xs font-bold shadow-[0_4px_12px_rgba(255,71,87,0.3)] disabled:opacity-50"
          >
            Save location
          </button>
        </div>
      </div>
    </div>
  );
}
