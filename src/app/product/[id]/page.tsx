"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import CloseButton from "@/components/CloseButton";
import ViewTracker from "@/components/ViewTracker";
import SmartImg from "@/components/SmartImg";
import LocationMap from "@/components/LocationMap";
import { useAsyncData } from "@/lib/useAsyncData";
import {
  getFood,
  getRestaurant,
  getRelatedFoods,
  getReviews,
} from "@/lib/data";
import type { Food, Restaurant, Review } from "@/lib/data";

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);

  const { data: food, loading } = useAsyncData<Food | undefined>(() => getFood(id), [id]);
  const { data: restaurant } = useAsyncData<Restaurant | undefined>(
    async () => (food ? getRestaurant(food.restaurantId) : undefined),
    [food?.restaurantId],
  );
  const { data: related } = useAsyncData<Food[]>(
    async () => (food ? getRelatedFoods(food) : []),
    [food?.id],
  );
  const reviews: Review[] = getReviews(id);

  if (loading || !food) {
    return (
      <div>
        <CloseButton />
        <div className="w-full aspect-square skel" />
        <div className="p-5 space-y-3">
          <div className="h-7 w-2/3 rounded skel" />
          <div className="h-4 w-1/3 rounded skel" />
          <div className="h-24 rounded-xl skel mt-4" />
        </div>
      </div>
    );
  }

  if (!food) {
    return (
      <div className="px-6 pt-24 text-center">
        <i className="fa-solid fa-magnifying-glass-minus text-4xl text-text-light" aria-hidden />
        <h1 className="mt-4 font-bold">Dish not found</h1>
        <Link href="/" className="mt-3 inline-block text-primary font-semibold text-sm">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <ViewTracker foodId={food.id} />
      <CloseButton />

      {/* Image */}
      <section className="anim-fade-up relative w-full aspect-square bg-gray-200 flex items-center justify-center">
        <SmartImg
          src={food.image}
          alt={food.name}
          eager
          className="w-full h-full"
          imgClassName="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 right-4 bg-gray-900 text-white font-bold px-4 py-2 rounded-full shadow-lg text-lg">
          ৳{food.price}
        </div>
      </section>

      {/* Restaurant & food header */}
      <section className="p-5 flex items-center gap-4 border-b border-line anim-fade-up" style={{ animationDelay: "80ms" }}>
        {restaurant && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={restaurant.logo}
              alt=""
              loading="lazy"
              className="w-16 h-16 rounded-xl flex-shrink-0 object-cover border border-gray-300"
            />
            <div className="flex flex-col min-w-0">
              <Link
                href={`/restaurants/${restaurant.id}`}
                className="text-sm font-medium text-text-light uppercase tracking-wide truncate"
              >
                {restaurant.name}
              </Link>
              <h1 className="text-2xl font-extrabold leading-tight">{food.name}</h1>
            </div>
          </>
        )}
      </section>

      {/* Description */}
      <section className="p-5 border-b border-line">
        <h2 className="text-lg font-bold mb-2">Description</h2>
        <p className="text-text-light leading-relaxed text-sm">{food.description}</p>
        <div className="mt-3 text-sm font-semibold text-[#ffa502]">
          <i className="fa-solid fa-star mr-1" aria-hidden />
          {food.rating}{" "}
          <span className="text-text-light font-normal">({food.reviews}+ reviews)</span>
        </div>
      </section>

      {/* Location */}
      {restaurant && (
        <section className="p-5 border-b border-line">
          <h2 className="text-lg font-bold mb-2">Location</h2>
          <div className="flex items-start gap-3 mt-2">
            <i className="fa-solid fa-map-pin text-text-light w-5 mt-0.5" aria-hidden />
            <p className="text-text-light text-sm">
              {restaurant.address}
              <br />
              Open today until {restaurant.openUntil}
            </p>
          </div>
          <LocationMap lat={restaurant.lat} lng={restaurant.lng} address={restaurant.address} />
        </section>
      )}

      {/* Reviews */}
      <section className="p-5 border-b border-line">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Reviews</h2>
          <span className="text-sm font-bold text-[#ffa502] flex items-center gap-1">
            <i className="fa-solid fa-star fill-current" aria-hidden /> {food.rating} (
            {food.reviews})
          </span>
        </div>
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.author} className="bg-background p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-gray-300 rounded-full" />
                <span className="text-sm font-semibold text-text-dark">{review.author}</span>
              </div>
              <p className="text-sm text-text-light">{review.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Also ate together with */}
      <section className="p-5 pb-32">
        <h2 className="text-lg font-bold mb-4">Also ate together with</h2>
        <div className="space-y-4">
          {(related ?? []).map((item, i) => (
            <Link
              key={item.id}
              href={`/product/${item.id}`}
              className="anim-fade-up flex items-center gap-4 pressable"
              style={{ animationDelay: `${Math.min(i * 70, 280)}ms` }}
            >
              <SmartImg
                src={item.image}
                alt={item.name}
                className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0"
                imgClassName="w-full h-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{item.name}</h3>
                <p className="text-sm text-text-light truncate">{item.category}</p>
              </div>
              <span className="font-bold">+৳{item.price}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
