import Link from "next/link";
import { getAllRestaurants } from "@/lib/data";

export default async function MapsPage() {
  const restaurants = await getAllRestaurants();
  return (
    <div className="px-4 pt-6">
      <h1 className="text-xl font-semibold mb-1">
        <i className="fa-solid fa-map-location-dot text-primary mr-2" aria-hidden />
        Map view
      </h1>
      <p className="text-sm text-text-light mb-5">
        Live map is coming soon — here are restaurants sorted by distance.
      </p>

      {/* Placeholder map area */}
      <div className="relative h-56 rounded-xl overflow-hidden shadow-card border border-line mb-6 bg-[linear-gradient(135deg,#eef2f7_25%,#e3e9f0_25%,#e3e9f0_50%,#eef2f7_50%,#eef2f7_75%,#e3e9f0_75%)] bg-[length:24px_24px] flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary/20 border-4 border-primary/60 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-primary" />
        </div>
        <span className="absolute bottom-2 right-2 text-[10px] text-text-light bg-white/80 px-2 py-1 rounded-full">
          You are here
        </span>
      </div>

      <h2 className="font-bold mb-3">Nearby ({restaurants.length})</h2>
      <ul className="space-y-2 pb-4">
        {[...restaurants]
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .map((r) => (
            <li key={r.id}>
              <Link
                href={`/restaurants/${r.id}`}
                className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-card border border-line hover:text-primary transition-colors"
              >
                <i className="fa-solid fa-location-dot text-primary w-5 text-center" aria-hidden />
                <span className="flex-1 text-sm font-medium truncate">{r.name}</span>
                <span className="text-xs text-text-light">{r.distanceKm} km</span>
              </Link>
            </li>
          ))}
      </ul>
    </div>
  );
}
