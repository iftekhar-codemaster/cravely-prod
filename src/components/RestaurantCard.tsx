import Link from "next/link";
import type { Restaurant } from "@/lib/data";

export default function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="flex gap-3 bg-card rounded-xl p-3 shadow-card border border-line items-center transition-transform hover:-translate-y-0.5"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={restaurant.image}
        alt={restaurant.name}
        className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
      />
      <div className="min-w-0">
        <div className="font-semibold truncate flex items-center gap-1.5">
          {restaurant.name}
          {restaurant.verified && (
            <i
              className="fa-solid fa-circle-check text-primary text-xs"
              title="Verified"
              aria-label="Verified"
            />
          )}
        </div>
        <div className="text-xs text-text-light mt-0.5">{restaurant.cuisine}</div>
        <div className="text-xs mt-1 flex items-center gap-2">
          <span className="text-[#ffa502] font-semibold">
            <i className="fa-solid fa-star mr-1" aria-hidden />
            {restaurant.rating}
          </span>
          <span className="text-text-light">({restaurant.reviews}+)</span>
          <span className="text-text-light">· {restaurant.distanceKm} km</span>
        </div>
        <div className="text-[11px] text-text-light mt-1 truncate">
          Open until {restaurant.openUntil}
        </div>
      </div>
    </Link>
  );
}
