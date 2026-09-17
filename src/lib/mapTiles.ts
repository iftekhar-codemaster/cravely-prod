const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();

export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// CARTO basemap tiles (voyager) — requires ?key= parameter to authenticate and avoid "API key required" watermark.
// Falls back to public CDN when no key is configured.
export const TILE_URL = CARTO_KEY
  ? `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_KEY}`
  : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

export const TILE_LAYER_OPTIONS = {
  attribution: TILE_ATTRIBUTION,
  subdomains: "abcd",
  maxZoom: 20,
};
