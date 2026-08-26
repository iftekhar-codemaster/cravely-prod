"use client";

// Lazy singleton loader for the Google Maps JS API. No-ops (returns null)
// when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured at build time.

let loading: Promise<boolean> | null = null;

export function googleMapsApiKey(): string | undefined {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
}

export function googleMapsConfigured(): boolean {
  return Boolean(googleMapsApiKey());
}

export function loadGoogleMaps(): Promise<boolean> {
  const key = googleMapsApiKey();
  if (!key) return Promise.resolve(false);
  const w = window as unknown as {
    google?: { maps?: unknown };
    __cravelyGmapsPromise?: Promise<boolean>;
  };
  if (w.google?.maps) return Promise.resolve(true);
  if (w.__cravelyGmapsPromise) return w.__cravelyGmapsPromise;

  loading = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=marker&v=weekly`;
    script.async = true;
    script.onload = () => resolve(Boolean(w.google?.maps));
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
  w.__cravelyGmapsPromise = loading;
  return loading;
}
