import Link from "next/link";
import type { Restaurant } from "@/lib/data";
import SmartImg from "@/components/SmartImg";
import RestaurantDistance from "@/components/RestaurantDistance";

export default function RestaurantCard({
  restaurant,
  distanceKm,
}: {
  restaurant: Restaurant;
  distanceKm?: number;
}) {
  const displayImage = restaurant.logo || restaurant.image;
  const fallback =
    distanceKm ??
    (restaurant.distanceKm && restaurant.distanceKm > 0
      ? restaurant.distanceKm
      : undefined);

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="flex gap-3 bg-card rounded-xl p-3 shadow-card border border-line items-center transition-transform hover:-translate-y-0.5"
    >
      <SmartImg
        src={displayImage}
        alt={restaurant.name}
        className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100"
        imgClassName="w-full h-full object-cover"
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
        <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
          <span className="text-[#ffa502] font-semibold">
            <i className="fa-solid fa-star mr-1" aria-hidden />
            {restaurant.rating}
          </span>
          <span className="text-text-light">({restaurant.reviews}+)</span>
          <span className="text-text-light">·</span>
          <RestaurantDistance
            lat={restaurant.lat}
            lng={restaurant.lng}
            fallbackKm={fallback}
          />
        </div>
        <div className="text-[11px] text-text-light mt-1 truncate">
          Open until {restaurant.openUntil}
        </div>
      </div>
    </Link>
  );
}
