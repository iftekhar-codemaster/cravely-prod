"use client";

import Link from "next/link";
import type { Food, Restaurant } from "@/lib/data";
import { getRestaurant } from "@/lib/data";
import { useAsyncData } from "@/lib/useAsyncData";
import SmartImg from "@/components/SmartImg";
import FavButton from "./FavButton";

export default function FoodCard({ food }: { food: Food }) {
  const { data: restaurant } = useAsyncData<Restaurant | undefined>(
    () => getRestaurant(food.restaurantId),
    [food.restaurantId],
  );

  return (
    <Link
      href={`/product/${food.id}`}
      className="block bg-card rounded-xl overflow-hidden shadow-card border border-line transition-transform hover:-translate-y-1"
    >
      <div className="relative h-32 bg-gray-200">
        <SmartImg src={food.image} alt={food.name} className="w-full h-full" imgClassName="w-full h-full object-cover" />
        <FavButton foodId={food.id} />
      </div>
      <div className="p-3">
        <div className="text-[15px] font-semibold mb-1 truncate">{food.name}</div>
        <div className="text-[13px] text-[#ffa502] mb-1.5">
          <i className="fa-solid fa-star mr-1" aria-hidden />
          {food.rating}
        </div>
        <div className="font-bold text-[15px] mb-2.5">৳{food.price}</div>
        {restaurant && (
          <div className="flex items-center gap-2 border-t border-line pt-2.5 text-xs text-text-light">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={restaurant.logo}
              alt=""
              className="w-5 h-5 rounded-full object-cover"
            />
            <span className="truncate">{restaurant.name}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
